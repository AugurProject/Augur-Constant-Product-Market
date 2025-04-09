import { OptionalSignal, useOptionalSignal } from '../../utils/OptionalSignal.js'
import { contributeToMarketDispute, contributeToMarketDisputeOnTentativeOutcome, disavowCrowdsourcers, doInitialReport, fetchHotLoadingMarketData, finalizeMarket, getDisputeWindow, getDisputeWindowInfo, getForkValues, getPreemptiveDisputeCrowdsourcer, getReportingHistory, getStakeOfReportingParticipant, getStakesOnAllOutcomesOnYesNoMarketOrCategorical, getWinningPayoutNumerators, migrateThroughOneFork, ReportingHistoryElement } from '../../utils/augurContractUtils.js'
import { addressString, areEqualArrays, bigintToDecimalString, decimalStringToBigint, formatUnixTimestampISO } from '../../utils/ethereumUtils.js'
import { ExtraInfo } from '../../CreateMarketUI/types/createMarketTypes.js'
import { MARKET_TYPES } from '../../utils/constants.js'
import { useSignal } from '@preact/signals'
import { AccountAddress, EthereumAddress } from '../../types/types.js'
import { humanReadableDateDelta, SomeTimeAgo } from './SomeTimeAgo.js'
import { MarketReportingOptions, MarketReportingWithoutStake, OutcomeStake } from '../../SharedUI/MarketReportingOptions.js'
import { Market, MarketData } from '../../SharedUI/Market.js'
import { getAllPayoutNumeratorCombinations, getOutcomeName } from '../../utils/augurUtils.js'
import { ReadClient, WriteClient } from '../../utils/ethereumWallet.js'

interface ForkMigrationProps {
	marketData: OptionalSignal<MarketData>
	outcomeStakes: OptionalSignal<readonly OutcomeStake[]>
	maybeWriteClient: OptionalSignal<WriteClient>
}

export const ForkMigration = ({ marketData, maybeWriteClient, outcomeStakes }: ForkMigrationProps) => {
	if (outcomeStakes.deepValue === undefined) return <></>
	const initialReportReason = useSignal<string>('')
	const selectedOutcome = useSignal<string | null>(null)
	const disavowCrowdsourcersButton = async () => {
		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) throw new Error('account missing')
		if (marketData.deepValue === undefined) throw new Error('marketData missing')
		await disavowCrowdsourcers(writeClient, marketData.deepValue.marketAddress)
	}
	const migrateThroughOneForkButton = async () => {
		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) throw new Error('account missing')
		if (marketData.deepValue === undefined) throw new Error('marketData missing')
		if (outcomeStakes.deepValue === undefined) throw new Error('outcomeStakes missing')
		const initialReportPayoutNumerators = outcomeStakes.deepValue.find((outcome) => outcome.outcomeName === selectedOutcome.value)?.payoutNumerators
		if (!initialReportPayoutNumerators) throw new Error('Selected outcome not found')
		await migrateThroughOneFork(writeClient, marketData.deepValue.marketAddress, initialReportPayoutNumerators, initialReportReason.peek())
	}
	return <div class = 'panel'>
		<div style = 'display: grid'>
			<span><b>Market Fork Migration:</b></span>
			<MarketReportingWithoutStake outcomeStakes = { outcomeStakes } selectedOutcome = { selectedOutcome }/>
			<label>
				Initial Report Reason:{' '}
				<input
					type = 'text'
					value = { initialReportReason.value }
					onChange = { (event) => {
						const target = event.target as HTMLInputElement
						initialReportReason.value = target.value
					} }
				/>
			</label>
		</div>
		<div style = 'margin-top: 1rem'>
			<button class = 'button is-primary' onClick = { disavowCrowdsourcersButton }>Disavow Crowdsourcers</button>
		</div>
		<div style = 'margin-top: 1rem'>
			<button class = 'button is-primary' onClick = { migrateThroughOneForkButton }>Migrate Through One Fork</button>
		</div>
	</div>
}

interface DisplayStakesProps {
	outcomeStakes: OptionalSignal<readonly OutcomeStake[]>
	maybeWriteClient: OptionalSignal<WriteClient>
	marketData: OptionalSignal<MarketData>
	disputeWindowInfo: OptionalSignal<Awaited<ReturnType<typeof getDisputeWindowInfo>>>
	preemptiveDisputeCrowdsourcerStake: OptionalSignal<bigint>
	forkValues: OptionalSignal<Awaited<ReturnType<typeof getForkValues>>>
}

export const DisplayStakes = ({ outcomeStakes, maybeWriteClient, marketData, disputeWindowInfo, preemptiveDisputeCrowdsourcerStake, forkValues }: DisplayStakesProps) => {
	if (outcomeStakes.deepValue === undefined) return <></>

	const selectedOutcome = useSignal<string | null>(null)
	const reason = useSignal<string>('')
	const amountInput = useSignal<string>('')

	const report = async (outcomeStake: OutcomeStake, reportReason: string, amount: bigint) => {
		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) throw new Error('account missing')
		if (marketData.deepValue === undefined) throw new Error('market missing')
		const market = marketData.deepValue.marketAddress

		const totalRepStake = outcomeStakes.deepValue?.reduce((prev, current) => prev + current.repStake, 0n)
		if (totalRepStake === 0n) await doInitialReport(writeClient, market, outcomeStake.payoutNumerators, reportReason, amount)
		if (outcomeStake.status === 'Winning') {
			return await contributeToMarketDisputeOnTentativeOutcome(
				writeClient,
				market,
				outcomeStake.payoutNumerators,
				amount,
				reportReason
			)
		}
		return await contributeToMarketDispute(
			writeClient,
			market,
			outcomeStake.payoutNumerators,
			amount,
			reportReason
		)
	}

	const handleReport = async () => {
		if (outcomeStakes.deepValue === undefined) return
		if (amountInput.value.trim() === '') throw new Error ('Input missing')
		const amountBigInt = decimalStringToBigint(amountInput.value, 18n)
		if (selectedOutcome.value === null) throw new Error('Invalid input')
		const outcomeStake = outcomeStakes.deepValue.find((outcome) => outcome.outcomeName === selectedOutcome.value)
		if (!outcomeStake) throw new Error('Selected outcome not found')
		try {
			await report(outcomeStake, reason.value, amountBigInt)
		} catch (error) {
			console.error('Error reporting for outcome:', outcomeStake.outcomeName, error)
		}
	}

	const ResolvingTo = () => {
		if (outcomeStakes.deepValue === undefined) return <></>
		if (disputeWindowInfo.deepValue === undefined) return <></>
		const winningOption = outcomeStakes.deepValue.find((outcome) => outcome.status === 'Winning')
		if (winningOption === undefined) return <></>
		const endDate = new Date(Number(disputeWindowInfo.deepValue.endTime) * 1000)
		return <div style = 'margin-top: 1rem'>
			<SomeTimeAgo priorTimestamp = { endDate } countBackwards = { true } diffToText = {
				(time: number) => {
					if (disputeWindowInfo.deepValue === undefined) return <></>
					if (time <= 0) return <>The market has resolved to "<b>{ winningOption.outcomeName }</b>".</>
					if (disputeWindowInfo.deepValue.isActive) return <>Resolving To "<b>{ winningOption.outcomeName }</b>" if not disputed in { humanReadableDateDelta(time) } ({ formatUnixTimestampISO(disputeWindowInfo.deepValue.endTime) }).</>
					return <>Resolving To "<b>{ winningOption.outcomeName }</b>" if not disputed in the next dispute round.</>
				}
			}/>
		</div>
	}

	const TotalRepStaked = () => {
		if (outcomeStakes.deepValue === undefined || forkValues.deepValue === undefined) return <></>
		return <div style = 'display: grid; margin-top: 1rem'>
			<span><b>Total Rep staked:</b>{ ' ' }{ bigintToDecimalString(outcomeStakes.deepValue.reduce((current, prev) => prev.repStake + current, 0n), 18n, 2) } REP</span>
			<span><b>Entering Slow Reporting after:</b>{ ' ' }{ bigintToDecimalString(forkValues.deepValue.disputeThresholdForDisputePacing, 18n, 2) } REP is staked within one round</span>
			<span><b>Forking Augur after:</b>{ ' ' }{ bigintToDecimalString(forkValues.deepValue.disputeThresholdForFork, 18n, 2) } REP is staked within one round</span>
		</div>
	}

	return (
		<div class = 'panel'>
			<div style = 'display: grid'>
				<span><b>Market Reporting:</b></span>
				<MarketReportingOptions outcomeStakes = { outcomeStakes } selectedOutcome = { selectedOutcome } preemptiveDisputeCrowdsourcerStake = { preemptiveDisputeCrowdsourcerStake }/>
				<TotalRepStaked/>
				<ResolvingTo/>
				<div style = 'margin-top: 1rem'>
					<label>
						Reason:{' '}
						<input
							type = 'text'
							value = { reason.value }
							style = { 'width: 100%' }
							placeholder = 'Optional: Explain why you believe this outcome is correct'
							onChange = { (event) => {
								const target = event.target as HTMLInputElement
								reason.value = target.value
							} }
						/>
					</label>
				</div>
				<div style = 'margin-top: 0.5rem'>
					<label>
						Amount:{' '}
						<input
							type = 'text'
							placeholder = ''
							value = { amountInput.value }
							onChange = { (event) => {
								const target = event.target as HTMLInputElement
								amountInput.value = target.value
							} }
						/>
					</label>
				</div>
				<div style = 'margin-top: 1rem'>
					<button class = 'button is-primary' onClick = { handleReport }>Report</button>
				</div>
			</div>
		</div>
	)
}

interface DisplayDisputeWindowProps {
	disputeWindowAddress: OptionalSignal<AccountAddress>
	disputeWindowInfo: OptionalSignal<Awaited<ReturnType<typeof getDisputeWindowInfo>>>
}

export const DisplayDisputeWindow = ({ disputeWindowAddress, disputeWindowInfo }: DisplayDisputeWindowProps) => {
	if (disputeWindowAddress.deepValue === undefined) return <></>
	if (disputeWindowInfo.deepValue === undefined) return <></>
	return <div class = 'panel'>
		<div style = 'display: grid'>
			<span><b>Dispute Window Address:</b>{ disputeWindowAddress.deepValue }</span>
			<span><b>Start:</b>{ formatUnixTimestampISO(disputeWindowInfo.deepValue.startTime) }</span>
			<span><b>End:</b>{ formatUnixTimestampISO(disputeWindowInfo.deepValue.endTime) }</span>
			<span><b>Is Active:</b>{ disputeWindowInfo.deepValue.isActive ? 'Yes' : 'No' }</span>
		</div>
	</div>
}

interface GetForkValuesProps {
	forkValues: OptionalSignal<Awaited<ReturnType<typeof getForkValues>>>
}
export const DisplayForkValues = ({ forkValues }: GetForkValuesProps) => {
	if (forkValues.deepValue === undefined) return <></>
	return <div class = 'panel'>
		<span><b>Fork Values</b></span>
		<div style = 'display: grid'>
			<span><b>Initial Report Min Value:</b>{ bigintToDecimalString(forkValues.deepValue.initialReportMinValue, 18n, 2) } REP</span>
			<span><b>Dispute Threshold For Dispute Pacing (one round):</b>{ bigintToDecimalString(forkValues.deepValue.disputeThresholdForDisputePacing, 18n, 2) } REP</span>
			<span><b>Dispute Threshold For Fork (one round):</b>{ bigintToDecimalString(forkValues.deepValue.disputeThresholdForFork, 18n, 2) } REP</span>
			<span><b>Fork Reputation Goal:</b>{ bigintToDecimalString(forkValues.deepValue.forkReputationGoal, 18n, 2) } REP</span>
		</div>
	</div>
}

interface ReportingHistoryProps {
	reportingHistory: OptionalSignal<readonly ReportingHistoryElement[]>
	marketData: OptionalSignal<MarketData>
}
export const ReportingHistory = ({ reportingHistory, marketData }: ReportingHistoryProps) => {
	if (reportingHistory.deepValue === undefined) return <></>
	if (marketData.deepValue === undefined) return <></>
	const allPayoutNumerators = getAllPayoutNumeratorCombinations(marketData.deepValue.hotLoadingMarketData.numOutcomes, marketData.deepValue.hotLoadingMarketData.numTicks)

	return <div class = 'panel'>
		<span><b>Reporting history for the market</b></span>
		<div style = 'display: grid'>
			{ reportingHistory.deepValue.map((round) => {
				if (marketData.deepValue === undefined) return <></>
				const marketType = MARKET_TYPES[marketData.deepValue.hotLoadingMarketData.marketType]
				if (marketType === undefined) throw new Error(`Invalid market type Id: ${ marketData.deepValue.hotLoadingMarketData.marketType }`)
				const payoutIndex = allPayoutNumerators.findIndex((option) => areEqualArrays(option, round.payoutNumerators))
				const outcomeName = getOutcomeName(payoutIndex, marketType, marketData.deepValue.hotLoadingMarketData.outcomes || [])
				return <span><b>Round { ' ' }{ round.round }</b>{ ': ' }{ outcomeName }{ ' ' }for{ ' ' }{ bigintToDecimalString(round.stake, 18n, 2) }{ ' ' }REP</span>
			})}
		</div>
	</div>
}

interface ReportingProps {
	maybeReadClient: OptionalSignal<ReadClient>
	maybeWriteClient: OptionalSignal<WriteClient>
	universe: OptionalSignal<AccountAddress>
	reputationTokenAddress: OptionalSignal<AccountAddress>
}

export const Reporting = ({ maybeReadClient, maybeWriteClient, universe, reputationTokenAddress }: ReportingProps) => {
	const marketAddressString = useSignal<string>('')
	const marketData = useOptionalSignal<MarketData>(undefined)
	const outcomeStakes = useOptionalSignal<readonly OutcomeStake[]>(undefined)
	const disputeWindowAddress = useOptionalSignal<AccountAddress>(undefined)
	const disputeWindowInfo = useOptionalSignal<Awaited<ReturnType<typeof getDisputeWindowInfo>>>(undefined)
	const preemptiveDisputeCrowdsourcerAddress = useOptionalSignal<AccountAddress>(undefined)
	const preemptiveDisputeCrowdsourcerStake = useOptionalSignal<bigint>(undefined)
	const forkValues = useOptionalSignal<Awaited<ReturnType<typeof getForkValues>>>(undefined)
	const reportingHistory = useOptionalSignal<readonly ReportingHistoryElement[]>(undefined)

	const getParsedExtraInfo = (extraInfo: string) => {
		try {
			return ExtraInfo.parse(JSON.parse(extraInfo))
		} catch(error) {
			return undefined
		}
	}

	const fetchMarketData = async () => {
		const readClient = maybeReadClient.deepPeek()
		if (readClient === undefined) throw new Error('missing readClient')
		if (reputationTokenAddress.deepValue === undefined) throw new Error('missing reputationTokenAddress')
		marketData.deepValue = undefined
		outcomeStakes.deepValue = undefined
		disputeWindowAddress.deepValue = undefined
		disputeWindowInfo.deepValue = undefined
		preemptiveDisputeCrowdsourcerAddress.deepValue = undefined
		preemptiveDisputeCrowdsourcerStake.deepValue = 0n
		forkValues.deepValue = undefined
		reportingHistory.deepValue = undefined

		const marketAddress = EthereumAddress.safeParse(marketAddressString.value.trim())
		if (!marketAddress.success) throw new Error('market not defined')
		const parsedMarketAddressString = addressString(marketAddress.value)
		const newMarketData = await fetchHotLoadingMarketData(readClient, parsedMarketAddressString)
		const parsedExtraInfo = getParsedExtraInfo(newMarketData.extraInfo)
		marketData.deepValue = { marketAddress: parsedMarketAddressString, parsedExtraInfo, hotLoadingMarketData: newMarketData }
		const currentMarketData = marketData.deepValue
		if (MARKET_TYPES[currentMarketData.hotLoadingMarketData.marketType] === 'Yes/No' || MARKET_TYPES[currentMarketData.hotLoadingMarketData.marketType] === 'Categorical') {
			const allPayoutNumerators = getAllPayoutNumeratorCombinations(marketData.deepValue.hotLoadingMarketData.numOutcomes, marketData.deepValue.hotLoadingMarketData.numTicks)
			const winningOption = await getWinningPayoutNumerators(readClient, parsedMarketAddressString)
			const winningIndex = winningOption === undefined ? -1 : allPayoutNumerators.findIndex((option) => areEqualArrays(option, winningOption))
			const stakes = await getStakesOnAllOutcomesOnYesNoMarketOrCategorical(readClient, parsedMarketAddressString, marketData.deepValue.hotLoadingMarketData.numOutcomes, marketData.deepValue.hotLoadingMarketData.numTicks)
			outcomeStakes.deepValue = stakes.map((repStake, index) => {
				const marketType = MARKET_TYPES[currentMarketData.hotLoadingMarketData.marketType]
				if (marketType === undefined) throw new Error(`Invalid market type Id: ${ currentMarketData.hotLoadingMarketData.marketType }`)
				const outcomeName = getOutcomeName(index, marketType, currentMarketData.hotLoadingMarketData.outcomes || [])
				const payoutNumerators = allPayoutNumerators[index]
				if (outcomeName === undefined || payoutNumerators === undefined) throw new Error(`outcome did not found for index: ${ index }. Outcomes: [${ currentMarketData.hotLoadingMarketData.outcomes.join(',') }]`)
				return {
					outcomeName,
					repStake,
					status: index === winningIndex ? 'Winning' : 'Losing',
					payoutNumerators,
				}
			})
		}
		disputeWindowAddress.deepValue = await getDisputeWindow(readClient, parsedMarketAddressString)
		if (EthereumAddress.parse(disputeWindowAddress.deepValue) !== 0n) {
			disputeWindowInfo.deepValue = await getDisputeWindowInfo(readClient, disputeWindowAddress.deepValue)
		}
		preemptiveDisputeCrowdsourcerAddress.deepValue = await getPreemptiveDisputeCrowdsourcer(readClient, parsedMarketAddressString)
		if (EthereumAddress.parse(preemptiveDisputeCrowdsourcerAddress.deepValue) !== 0n) {
			preemptiveDisputeCrowdsourcerStake.deepValue = await getStakeOfReportingParticipant(readClient, preemptiveDisputeCrowdsourcerAddress.deepValue)
		}

		forkValues.deepValue = await getForkValues(readClient, reputationTokenAddress.deepValue)
		reportingHistory.deepValue = await getReportingHistory(readClient, parsedMarketAddressString, newMarketData.disputeRound)
	}

	const finalizeMarketButton = async () => {
		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) throw new Error('missing writeClient')
		if (marketData.deepValue === undefined) throw new Error('missing market data')
		await finalizeMarket(writeClient, marketData.deepValue.marketAddress)
	}

	function handleMarketAddress(value: string) {
		marketAddressString.value = value
	}

	return <div class = 'subApplication'>
		<p style = 'margin: 0;'>Reporting:</p>
		<div style = 'display: grid; width: 100%; gap: 10px;'>
			<p style = 'margin: 0;'>Market address:</p>
			<input
				style = 'height: fit-content;'
				class = 'input'
				type = 'text'
				width = '100%'
				placeholder = '0x...'
				value = { marketAddressString.value }
				onInput = { e => handleMarketAddress(e.currentTarget.value) }
			/>
			<button class = 'button is-primary' onClick = { fetchMarketData }>Fetch Market Information</button>
			<Market marketData = { marketData } universe = { universe }/>
			<DisplayStakes outcomeStakes = { outcomeStakes } marketData = { marketData } maybeWriteClient = { maybeWriteClient } preemptiveDisputeCrowdsourcerStake = { preemptiveDisputeCrowdsourcerStake } disputeWindowInfo = { disputeWindowInfo } forkValues = { forkValues }/>
			<DisplayDisputeWindow disputeWindowAddress = { disputeWindowAddress } disputeWindowInfo = { disputeWindowInfo }/>
			<DisplayForkValues forkValues = { forkValues }/>
			<ReportingHistory marketData = { marketData } reportingHistory = { reportingHistory }/>
			<button class = 'button is-primary' onClick = { finalizeMarketButton }>Finalize Market</button>
			<ForkMigration marketData = { marketData } maybeWriteClient = { maybeWriteClient } outcomeStakes = { outcomeStakes }/>
		</div>
	</div>
}
