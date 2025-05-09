import { OptionalSignal, useOptionalSignal } from '../../utils/OptionalSignal.js'
import { contributeToMarketDispute, contributeToMarketDisputeOnTentativeOutcome, disavowCrowdsourcers, doInitialReport, fetchMarketData, finalizeMarket, getDisputeWindow, getDisputeWindowInfo, getForkValues, getPreemptiveDisputeCrowdsourcer, getReportingHistory, getStakeOfReportingParticipant, getWinningPayoutNumerators, migrateThroughOneFork, ReportingHistoryElement, getCrowdsourcerInfoByPayoutNumerator, derivePayoutDistributionHash } from '../../utils/augurContractUtils.js'
import { areEqualArrays, bigintToDecimalString, decimalStringToBigint, isDecimalString } from '../../utils/ethereumUtils.js'
import { Signal, useComputed, useSignal, useSignalEffect } from '@preact/signals'
import { AccountAddress, EthereumAddress, EthereumQuantity } from '../../types/types.js'
import { MarketReportingOptionsForYesNoAndCategorical, OutcomeStake } from '../../SharedUI/YesNoCategoricalMarketReportingOptions.js'
import { Market, MarketData } from '../../SharedUI/Market.js'
import { getAllPayoutNumeratorCombinations, maxStakeAmountForOutcome, getOutComeName, getPayoutNumeratorsFromScalarOutcome, areValidScalarPayoutNumeratorOptions } from '../../utils/augurUtils.js'
import { ReadClient, WriteClient } from '../../utils/ethereumWallet.js'
import { aggregateByPayoutDistribution, getReportingParticipantsForMarket } from '../../utils/augurExtraUtilities.js'
import { ReportedScalarInputs, ScalarInput } from '../../SharedUI/ScalarMarketReportingOptions.js'
import { Input } from '../../SharedUI/Input.js'
import { assertNever } from '../../utils/errorHandling.js'
import { SelectUniverse } from '../../SharedUI/SelectUniverse.js'

interface ForkMigrationProps {
	marketData: OptionalSignal<MarketData>
	outcomeStakes: OptionalSignal<readonly OutcomeStake[]>
	maybeWriteClient: OptionalSignal<WriteClient>
	disabled: Signal<boolean>
	refreshData: () => Promise<void>
}

export const ForkMigration = ({ marketData, maybeWriteClient, outcomeStakes, disabled, refreshData }: ForkMigrationProps) => {
	if (outcomeStakes.deepValue === undefined) return <></>
	if (disabled.value === true) return <></>
	const initialReportReason = useSignal<string>('')
	const selectedPayoutNumerators = useOptionalSignal<readonly bigint[]>(undefined)
	const disavowCrowdsourcersButton = async () => {
		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) throw new Error('account missing')
		if (marketData.deepValue === undefined) throw new Error('marketData missing')
		await disavowCrowdsourcers(writeClient, marketData.deepValue.marketAddress)
		await refreshData()
	}
	const migrateThroughOneForkButton = async () => {
		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) throw new Error('account missing')
		if (marketData.deepValue === undefined) throw new Error('marketData missing')
		if (outcomeStakes.deepValue === undefined) throw new Error('outcomeStakes missing')
		if (selectedPayoutNumerators.deepValue === undefined) throw new Error('selectedPayoutNumerators not found')
		await migrateThroughOneFork(writeClient, marketData.deepValue.marketAddress, selectedPayoutNumerators.deepValue, initialReportReason.peek())
		await refreshData()
	}
	return <div class = 'panel'>
		<div style = 'display: grid'>
			<span><b>Market Fork Migration:</b></span>
			<SelectUniverse marketData = { marketData } disabled = { disabled } outcomeStakes = { outcomeStakes } selectedPayoutNumerators = { selectedPayoutNumerators }/>
			<label>
				Initial Report Reason:{' '}
				<input
					disabled = { disabled }
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
			<button class = 'button button-primary' onClick = { disavowCrowdsourcersButton } disabled = { disabled }>Disavow Crowdsourcers</button>
		</div>
		<div style = 'margin-top: 1rem'>
			<button class = 'button button-primary' onClick = { migrateThroughOneForkButton } disabled = { disabled }>Migrate Through One Fork</button>
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
	refreshData: () => Promise<void>
}

export const DisplayStakes = ({ outcomeStakes, maybeWriteClient, marketData, disputeWindowInfo, preemptiveDisputeCrowdsourcerStake, forkValues, refreshData }: DisplayStakesProps) => {
	if (outcomeStakes.deepValue === undefined) return <></>
	if (forkValues.deepValue === undefined) return <></>

	const selectedOutcome = useSignal<string | null>(null)
	const selectedScalarOutcome = useOptionalSignal<bigint>(undefined)
	const selectedScalarOutcomeInvalid = useSignal<boolean>(false)

	const reason = useSignal<string>('')
	const amountInput = useOptionalSignal<EthereumQuantity>(undefined)
	const isSlowReporting = useComputed(() => marketData.deepValue?.lastCompletedCrowdSourcer !== undefined && forkValues.deepValue !== undefined && marketData.deepValue.lastCompletedCrowdSourcer.size >= forkValues.deepValue.disputeThresholdForDisputePacing)
	const isInitialReporting = useComputed(() => marketData.deepValue?.reportingState === 'OpenReporting' || marketData.deepValue?.reportingState === 'DesignatedReporting')
	const canInitialReport = useComputed(() => marketData.deepValue?.reportingState === 'OpenReporting' || (marketData.deepValue?.reportingState === 'DesignatedReporting' && marketData.deepValue.designatedReporter === maybeWriteClient.deepValue?.account.address))

	const areOptionsDisabled = useComputed(() => !disputeWindowInfo.deepValue?.isActive && isSlowReporting.value)

	const selectedOutcomeName = useComputed(() => {
		if (marketData.deepValue === undefined) return undefined
		if (marketData.deepValue.marketType === 'Scalar') {
			const numTicks = marketData.deepValue.numTicks
			const minPrice = marketData.deepValue?.displayPrices[0]
			const maxPrice = marketData.deepValue?.displayPrices[1]
			if (minPrice === undefined || maxPrice === undefined) return undefined
			if (!areValidScalarPayoutNumeratorOptions(selectedScalarOutcomeInvalid.value, selectedScalarOutcome.deepValue, minPrice, maxPrice, numTicks)) return undefined
			const payoutNumerators = getPayoutNumeratorsFromScalarOutcome(selectedScalarOutcomeInvalid.value, selectedScalarOutcome.deepValue, minPrice, maxPrice, numTicks)
			return getOutComeName(payoutNumerators, marketData.deepValue)
		} else {
			if (outcomeStakes.deepValue === undefined) return undefined
			if (selectedOutcome.value === null) return undefined
			const outcomeStake = outcomeStakes.deepValue.find((outcome) => outcome.outcomeName === selectedOutcome.value)
			if (!outcomeStake) return undefined
			return outcomeStake.outcomeName
		}
	})
	const reportDisabled = useComputed(() => (isDisabled.value || maxStakeAmount.value === undefined || maxStakeAmount.value === 0n)
		&& !isInitialReporting.value
		|| amountInput.deepValue === undefined
	)

	const maxStakeAmount = useComputed(() => {
		if (marketData.deepValue === undefined) return undefined
		if (forkValues.deepValue === undefined) return undefined
		if (outcomeStakes.deepValue === undefined) return undefined
		if (marketData.deepValue.marketType === 'Scalar') {
			const numTicks = marketData.deepValue.numTicks
			const minPrice = marketData.deepValue?.displayPrices[0]
			const maxPrice = marketData.deepValue?.displayPrices[1]
			if (minPrice === undefined || maxPrice === undefined) throw new Error('displayPrices is undefined')
			if (!selectedScalarOutcomeInvalid.value && selectedScalarOutcome.deepValue === undefined) return undefined
			if (!areValidScalarPayoutNumeratorOptions(selectedScalarOutcomeInvalid.value, selectedScalarOutcome.deepValue, minPrice, maxPrice, numTicks)) return undefined
			const payoutNumerators = getPayoutNumeratorsFromScalarOutcome(selectedScalarOutcomeInvalid.value, selectedScalarOutcome.deepValue, minPrice, maxPrice, numTicks)
			const existingOutComestake = outcomeStakes.deepValue.find((outcome) => areEqualArrays(outcome.payoutNumerators, payoutNumerators))
			const totalStake = outcomeStakes.deepValue.reduce((current, prev) => prev.repStake + current, 0n)
			const outcomeStake = existingOutComestake !== undefined ? existingOutComestake : {
				outcomeName: getOutComeName(payoutNumerators, marketData.deepValue),
				repStake: 0n,
				status: 'Losing',
				payoutNumerators,
				alreadyContributedToOutcomeStake: undefined
			} as const
			return maxStakeAmountForOutcome(outcomeStake, totalStake, isSlowReporting.value, preemptiveDisputeCrowdsourcerStake.deepValue || 0n, forkValues.deepValue.disputeThresholdForDisputePacing, marketData.deepValue.lastCompletedCrowdSourcer)
		} else {
			if (selectedOutcome.value === null) return undefined
			const outcomeStake = outcomeStakes.deepValue.find((outcome) => outcome.outcomeName === selectedOutcome.value)
			const totalStake = outcomeStakes.deepValue.reduce((current, prev) => prev.repStake + current, 0n)
			if (outcomeStake === undefined) return undefined
			return maxStakeAmountForOutcome(outcomeStake, totalStake, isSlowReporting.value, preemptiveDisputeCrowdsourcerStake.deepValue || 0n, forkValues.deepValue.disputeThresholdForDisputePacing, marketData.deepValue.lastCompletedCrowdSourcer)
		}
	})

	const isDisabled = useComputed(() => !disputeWindowInfo.deepValue?.isActive && isSlowReporting.value)
	const report = async (outcomeStake: OutcomeStake, reportReason: string, amount: bigint) => {
		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) throw new Error('account missing')
		if (marketData.deepValue === undefined) throw new Error('market missing')
		const market = marketData.deepValue.marketAddress

		const totalRepStake = outcomeStakes.deepValue?.reduce((prev, current) => prev + current.repStake, 0n)
		if (totalRepStake === 0n) await doInitialReport(writeClient, market, outcomeStake.payoutNumerators, reportReason, amount)
		else if (outcomeStake.status === 'Winning') {
			await contributeToMarketDisputeOnTentativeOutcome(
				writeClient,
				market,
				outcomeStake.payoutNumerators,
				amount,
				reportReason
			)
		} else {
			await contributeToMarketDispute(
				writeClient,
				market,
				outcomeStake.payoutNumerators,
				amount,
				reportReason
			)
		}
		await refreshData()
	}

	const handleReport = async () => {
		if (outcomeStakes.deepValue === undefined) throw new Error ('Outcome stakes missing')
		if (marketData.deepValue === undefined) throw new Error ('market data missing')
		if (amountInput.deepValue === undefined) throw new Error ('Input missing')
		if (marketData.deepValue.marketType === 'Scalar') {
			const numTicks = marketData.deepValue.numTicks
			const minPrice = marketData.deepValue?.displayPrices[0]
			const maxPrice = marketData.deepValue?.displayPrices[1]
			if (minPrice === undefined || maxPrice === undefined) throw new Error('displayPrices is undefined')
			const payoutNumerators = getPayoutNumeratorsFromScalarOutcome(selectedScalarOutcomeInvalid.value, selectedScalarOutcome.deepValue, minPrice, maxPrice, numTicks)
			const invalidOutcomeStake = outcomeStakes.deepValue.find((outcome) => areEqualArrays(outcome.payoutNumerators, payoutNumerators))
			const reportingOutcomeStake = invalidOutcomeStake !== undefined ? invalidOutcomeStake : {
				outcomeName: getOutComeName(payoutNumerators, marketData.deepValue),
				repStake: 0n,
				status: 'Losing',
				payoutNumerators,
				alreadyContributedToOutcomeStake: undefined
			} as const
			try {
				await report(reportingOutcomeStake, reason.value, amountInput.deepValue)
			} catch (error) {
				console.error('Error reporting for payout numerators:', payoutNumerators.join(', '), error)
			}
		} else {
			if (selectedOutcome.value === null) throw new Error('Invalid input')
			const outcomeStake = outcomeStakes.deepValue.find((outcome) => outcome.outcomeName === selectedOutcome.value)
			if (!outcomeStake) throw new Error('Selected outcome not found')
			try {
				await report(outcomeStake, reason.value, amountInput.deepValue)
			} catch (error) {
				console.error('Error reporting for outcome:', outcomeStake.outcomeName, error)
			}
		}
	}

	const setMaxStake = () => {
		if (maxStakeAmount.value === undefined) {
			amountInput.deepValue = 0n
			return
		}
		amountInput.deepValue = maxStakeAmount.value
	}

	const minValue = useComputed(() => marketData.deepValue?.displayPrices[0] || 0n)
	const maxValue = useComputed(() => marketData.deepValue?.displayPrices[1] || 0n)
	const numTicks = useComputed(() => marketData.deepValue?.numTicks || 0n)
	const scalarDenomination = useComputed(() => marketData.deepValue?.parsedExtraInfo?._scalarDenomination || '')

	const ReportingComponent = useComputed(() => {
		if (marketData.deepValue === undefined) return <></>
		if (marketData.deepValue.marketType === 'Scalar') {
			return <div key = { marketData.deepValue.marketAddress } style = { { display: 'grid', gridTemplateRows: 'max-content max-content', gap: '2rem', alignItems: 'center' } }>
				<ReportedScalarInputs outcomeStakes = { outcomeStakes } preemptiveDisputeCrowdsourcerStake = { preemptiveDisputeCrowdsourcerStake }/>
				<ScalarInput value = { selectedScalarOutcome } invalid = { selectedScalarOutcomeInvalid } minValue = { minValue } maxValue = { maxValue } numTicks = { numTicks } unit = { scalarDenomination } disabled = { areOptionsDisabled } />
			</div>
		} else {
			return <MarketReportingOptionsForYesNoAndCategorical outcomeStakes = { outcomeStakes } selectedOutcome = { selectedOutcome } preemptiveDisputeCrowdsourcerStake = { preemptiveDisputeCrowdsourcerStake } isSlowReporting = { isSlowReporting } forkValues = { forkValues } areOptionsDisabled = { areOptionsDisabled } canInitialReport = { canInitialReport } marketData = { marketData }/>
		}
	})

	return <div class = 'reporting-panel'>
		<h3>Market Reporting:</h3>
		{ isDisabled.value && (<span><b>The reporting is closed for this round. Please check again in the next round.</b></span>)}
		{ ReportingComponent }
		<div>
			<label>
				<span style = { { fontWeight: '500', display: 'block', marginBottom: '0.25rem' } }>Reason:</span>
				<input
					type = 'text'
					class = 'reporting-panel-input'
					value = { reason.value }
					disabled = { isDisabled.value }
					placeholder = 'Optional: Explain why you believe this outcome is correct'
					onChange = { (event) => {
						const target = event.target as HTMLInputElement
						reason.value = target.value
					} }
				/>
			</label>
		</div>

		<div>
			<label>
				<span style = { { fontWeight: '500', display: 'block', marginBottom: '0.25rem' } }>Amount:</span>
				<div style = { { display: 'flex', alignItems: 'center', gap: '0.5em' } }>
					<Input
						class = 'input reporting-panel-input'
						type = 'text'
						placeholder = 'REP to stake'
						disabled = { isDisabled.value }
						style = { { maxWidth: '300px' } }
						value = { amountInput }
						sanitize = { (amount: string) => amount.trim() }
						tryParse = { (amount: string | undefined) => {
							if (amount === undefined) return { ok: false } as const
							if (!isDecimalString(amount.trim())) return { ok: false } as const
							const parsed = decimalStringToBigint(amount.trim(), 18n)
							return { ok: true, value: parsed } as const
						}}
						serialize = { (amount: EthereumQuantity | undefined) => {
							if (amount === undefined) return ''
							return bigintToDecimalString(amount, 18n, 18)
						}}
					/>
					<span class = 'unit'>REP</span>
					{ maxStakeAmount.value !== undefined && !isDisabled.value && (
						<>
							<span style = 'white-space: nowrap'>/ { bigintToDecimalString(maxStakeAmount.value, 18n, 2) } REP</span>
							<button class = 'button button-primary button-small' onClick = { setMaxStake }>Max</button>
							{ marketData.deepValue?.repBond !== undefined && isInitialReporting.value && (
								<span style = 'white-space: nowrap'>+ { bigintToDecimalString(marketData.deepValue.repBond, 18n, 2) } (initial reporter bond)</span>
							)}
						</>
					)}
				</div>
			</label>
		</div>

		<div>
			<button
				style = { { width: '100%' } }
				class = 'button button-primary'
				disabled = { reportDisabled.value }
				onClick = { handleReport }>
				{ selectedOutcomeName.value !== undefined && amountInput.deepValue !== undefined && !reportDisabled.value ? `Report "${ selectedOutcomeName.value }" for ${ bigintToDecimalString(amountInput.deepValue, 18n, 2) } REP` : 'Report'}
			</button>
		</div>
	</div>
}

interface ReportingHistoryProps {
	reportingHistory: OptionalSignal<readonly ReportingHistoryElement[]>
	marketData: OptionalSignal<MarketData>
	outcomeStakes: OptionalSignal<readonly OutcomeStake[]>
	forkValues: OptionalSignal<Awaited<ReturnType<typeof getForkValues>>>
}
export const ReportingHistory = ({ reportingHistory, marketData, outcomeStakes, forkValues }: ReportingHistoryProps) => {
	if (reportingHistory.deepValue === undefined) return <></>
	if (marketData.deepValue === undefined) return <></>
	if (outcomeStakes.deepValue === undefined || forkValues.deepValue === undefined) return <></>

	return <div class = 'reporting-history'>
		<h3>Reporting History:</h3>

		{ reportingHistory.deepValue.map((round) => {
			if (marketData.deepValue === undefined) return <></>

			const marketType = marketData.deepValue.marketType
			if (marketType === undefined) throw new Error(`Invalid market type Id: ${ marketData.deepValue.marketType }`)
			const outcomeName = getOutComeName(round.payoutNumerators, marketData.deepValue)

			return <div class = 'reporting-round'>
				<span><b>{ round.type } Round { round.round }</b></span>
				<span>Outcome: { outcomeName }</span>
				<span>Stake: { bigintToDecimalString(round.stake, 18n, 2) } REP</span>
				<span>Size: { bigintToDecimalString(round.size, 18n, 2) } REP</span>
			</div>
		})}

		<div class = 'reporting-summary'>
			<span><b>Total REP Staked:</b> { bigintToDecimalString(outcomeStakes.deepValue.reduce((current, prev) => prev.repStake + current, 0n), 18n, 2) } REP</span>
			<span><b>Forking Augur After:</b> { bigintToDecimalString(forkValues.deepValue.disputeThresholdForFork, 18n, 2) } REP staked within one round</span>
		</div>
	</div>
}

interface ReportingProps {
	maybeReadClient: OptionalSignal<ReadClient>
	maybeWriteClient: OptionalSignal<WriteClient>
	universe: OptionalSignal<AccountAddress>
	forkValues: OptionalSignal<Awaited<ReturnType<typeof getForkValues>>>
	currentTimeInBigIntSeconds: Signal<bigint>
	selectedMarket: OptionalSignal<AccountAddress>
}

export const Reporting = ({ maybeReadClient, maybeWriteClient, universe, forkValues, currentTimeInBigIntSeconds, selectedMarket }: ReportingProps) => {
	const marketData = useOptionalSignal<MarketData>(undefined)
	const outcomeStakes = useOptionalSignal<readonly OutcomeStake[]>(undefined)
	const disputeWindowInfo = useOptionalSignal<Awaited<ReturnType<typeof getDisputeWindowInfo>>>(undefined)
	const preemptiveDisputeCrowdsourcerAddress = useOptionalSignal<AccountAddress>(undefined)
	const preemptiveDisputeCrowdsourcerStake = useOptionalSignal<bigint>(undefined)
	const reportingHistory = useOptionalSignal<readonly ReportingHistoryElement[]>(undefined)
	const isInvalidMarketAddress = useSignal<boolean>(false)

	const finalizeDisabled = useComputed(() => marketData.deepValue?.reportingState !== 'AwaitingFinalization')
	const migrationDisabled = useComputed(() => marketData.deepValue?.reportingState !== 'AwaitingForkMigration')
	const showReporting = useComputed(() => {
		const state = marketData.deepValue?.reportingState
		return state === 'CrowdsourcingDispute' || state === 'DesignatedReporting' || state === 'OpenReporting' || state === 'AwaitingNextWindow'
	})

	const clear = () => {
		marketData.deepValue = undefined
		outcomeStakes.deepValue = undefined
		disputeWindowInfo.deepValue = undefined
		preemptiveDisputeCrowdsourcerAddress.deepValue = undefined
		preemptiveDisputeCrowdsourcerStake.deepValue = 0n
		reportingHistory.deepValue = undefined
	}

	useSignalEffect(() => {
		selectedMarket.deepValue
		clear()
	})

	useSignalEffect(() => {
		maybeReadClient.deepValue
		selectedMarket.deepValue
		refreshData()
	})

	const refreshData = async () => {
		if (maybeReadClient.deepValue === undefined) return
		const readClient = maybeReadClient.deepValue
		if (selectedMarket.deepValue === undefined) return
		marketData.deepValue = await fetchMarketData(maybeReadClient.deepValue, selectedMarket.deepValue)
		const currentMarketData = marketData.deepValue

		const getAllInterestingPayoutNumerators = async() => {
			const reportingParticipants = await getReportingParticipantsForMarket(readClient, currentMarketData.marketAddress)
			switch (currentMarketData.marketType) {
				case 'Categorical':
				case 'Yes/No': {
					// its possible for Augur to have "malformed payout numerators" being reported. Such as you can report 80% yes and 20% no on Yes/No market.
					// We get these (along with valid ones that exist in the data) with `getReportingParticipantsForMarket`
					// we merge all valid ones with all existing ones to get all interesting (as in either reported ones, or ones that make sense to report for) reporting options
					const allValidPayoutNumerators = getAllPayoutNumeratorCombinations(currentMarketData.numOutcomes, currentMarketData.numTicks)
					const allPayoutNumeratorsWithDuplicates = [...allValidPayoutNumerators.map((numerator) => ({ size: 0n, stake: 0n, payoutNumerators: numerator })), ...reportingParticipants]
					return aggregateByPayoutDistribution(allPayoutNumeratorsWithDuplicates)
				}
				case 'Scalar': return aggregateByPayoutDistribution(reportingParticipants)
				default: assertNever(currentMarketData.marketType)
			}
		}
		const allInterestingPayoutNumerators = await getAllInterestingPayoutNumerators()
		const winningOption = await getWinningPayoutNumerators(maybeReadClient.deepValue, selectedMarket.deepValue)
		const winningIndex = winningOption === undefined ? -1 : allInterestingPayoutNumerators.findIndex((option) => areEqualArrays(option.payoutNumerators, winningOption))
		outcomeStakes.deepValue = await Promise.all(allInterestingPayoutNumerators.map(async (info, index) => {
			const payoutNumerators = info.payoutNumerators
			const payoutHash = EthereumQuantity.parse(derivePayoutDistributionHash(payoutNumerators, currentMarketData.numTicks, currentMarketData.numOutcomes))
			return {
				outcomeName: getOutComeName(payoutNumerators, currentMarketData),
				repStake: info.stake,
				status: index === winningIndex ? 'Winning' : 'Losing',
				payoutNumerators,
				alreadyContributedToOutcomeStake: (await getCrowdsourcerInfoByPayoutNumerator(readClient, currentMarketData.marketAddress, payoutHash))?.stake
			}
		}))
		const disputeWindowAddress = await getDisputeWindow(maybeReadClient.deepValue, selectedMarket.deepValue)
		if (EthereumAddress.parse(disputeWindowAddress) !== 0n) {
			disputeWindowInfo.deepValue = await getDisputeWindowInfo(maybeReadClient.deepValue, disputeWindowAddress)
		}
		preemptiveDisputeCrowdsourcerAddress.deepValue = await getPreemptiveDisputeCrowdsourcer(maybeReadClient.deepValue, selectedMarket.deepValue)
		if (EthereumAddress.parse(preemptiveDisputeCrowdsourcerAddress.deepValue) !== 0n) {
			preemptiveDisputeCrowdsourcerStake.deepValue = await getStakeOfReportingParticipant(maybeReadClient.deepValue, preemptiveDisputeCrowdsourcerAddress.deepValue)
		}
		if (!(currentMarketData.reportingState === 'PreReporting'
			|| currentMarketData.reportingState === 'OpenReporting'
			|| currentMarketData.reportingState === 'DesignatedReporting')) {
			reportingHistory.deepValue = await getReportingHistory(maybeReadClient.deepValue, selectedMarket.deepValue, currentMarketData.disputeRound)
		}
	}

	const finalizeMarketButton = async () => {
		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) throw new Error('missing writeClient')
		if (marketData.deepValue === undefined) throw new Error('missing market data')
		await finalizeMarket(writeClient, marketData.deepValue.marketAddress)
		await refreshData()
	}

	return <div class = 'subApplication'>
		<div style = 'display: grid; width: 100%; gap: 10px;'>
			<Market marketData = { marketData } universe = { universe } forkValues = { forkValues } disputeWindowInfo = { disputeWindowInfo } currentTimeInBigIntSeconds = { currentTimeInBigIntSeconds } addressComponent = { <>
				<div style = { { display: 'grid', gridTemplateColumns: 'auto min-content', gap: '0.5rem' } }>
					<Input
						style = 'height: fit-content;'
						key = 'market-reporting-input'
						class = 'input'
						type = 'text'
						width = '100%'
						placeholder = 'Market address'
						value = { selectedMarket }
						sanitize = { (addressString: string) => addressString }
						tryParse = { (marketAddressString: string | undefined) => {
							if (marketAddressString === undefined) return { ok: false } as const
							const parsed = EthereumAddress.safeParse(marketAddressString.trim())
							if (parsed.success) return { ok: true, value: marketAddressString.trim() } as const
							return { ok: false } as const
						}}
						serialize = { (marketAddressString: string | undefined) => {
							if (marketAddressString === undefined) return ''
							return marketAddressString.trim()
						} }
						invalidSignal = { isInvalidMarketAddress }
					/>
					<button class = 'button button-primary' onClick = { refreshData }>Refresh</button>
				</div>
			</> }>
				{ showReporting.value === false ? <></> : <>
					<ReportingHistory marketData = { marketData } reportingHistory = { reportingHistory } outcomeStakes = { outcomeStakes } forkValues = { forkValues }/>
					<DisplayStakes outcomeStakes = { outcomeStakes } marketData = { marketData } maybeWriteClient = { maybeWriteClient } preemptiveDisputeCrowdsourcerStake = { preemptiveDisputeCrowdsourcerStake } disputeWindowInfo = { disputeWindowInfo } forkValues = { forkValues } refreshData = { refreshData }/>
					{ marketData.deepValue === undefined || finalizeDisabled.value ? <> </> : <button class = 'button button-primary' onClick = { finalizeMarketButton } disabled = { finalizeDisabled }>Finalize Market</button> }
				</> }
				<ForkMigration marketData = { marketData } maybeWriteClient = { maybeWriteClient } outcomeStakes = { outcomeStakes } disabled = { migrationDisabled } refreshData = { refreshData }/>
			</Market>
		</div>
	</div>
}
