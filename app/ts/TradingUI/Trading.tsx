import { OptionalSignal, useOptionalSignal } from '../utils/OptionalSignal.js'
import { fetchMarketData, getDisputeWindow, getDisputeWindowInfo, getForkValues } from '../utils/augurContractUtils.js'
import { Signal, useComputed, useSignal, useSignalEffect } from '@preact/signals'
import { AccountAddress, EthereumAddress, NonHexBigInt } from '../types/types.js'
import { Market, MarketData } from '../SharedUI/Market.js'
import { ReadClient, WriteClient } from '../utils/ethereumWallet.js'
import { Input } from '../SharedUI/Input.js'
import { enterPosition, exitPosition, expectedSharesAfterSwap, expectedSharesNeededForSwap, getShareBalances, isErc1155ApprovedForAll, isThereAugurConstantProductmarket } from '../utils/augurConstantProductMarketUtils.js'
import { bigintToDecimalString, bigintToDecimalStringWithUnknown, decimalStringToBigint, isDecimalString } from '../utils/ethereumUtils.js'
import { getAllowanceErc20Token } from '../utils/erc20.js'
import { AUGUR_SHARE_DECIMALS, AUGUR_SHARE_TOKEN, DAI_TOKEN_ADDRESS, ONE_YEAR_IN_SECONDS } from '../utils/constants.js'
import { Toggle } from '../SharedUI/Toggle.js'
import { TradingAndLiquidityProvidingAllowances } from '../SharedUI/TradingAndLiquidityProvidingAllowances.js'
import { DaiNameAndSymbol, NoNameAndSymbol, YesNameAndSymbol } from '../SharedUI/tokens.js'
import { BigInputBox } from '../SharedUI/BigInputBox.js'
import { getAugurConstantProductMarketRouterAddress, isAugurConstantProductMarketRouterDeployed } from '../utils/augurDeployment.js'
import { min } from '../utils/utils.js'
import { ShareBalances } from '../SharedUI/ShareBalances.js'
import { useEffect } from 'preact/hooks'

interface TradingViewProps {
	maybeReadClient: OptionalSignal<ReadClient>
	maybeWriteClient: OptionalSignal<WriteClient>
	marketData: OptionalSignal<MarketData>
	currentTimeInBigIntSeconds: Signal<bigint>
}

const TradingView = ({ maybeReadClient, maybeWriteClient, marketData, currentTimeInBigIntSeconds }: TradingViewProps) => {
	const daiInputAmountToBuy = useOptionalSignal<bigint>(undefined)
	const sharesToSellInputAmount = useOptionalSignal<bigint>(undefined)
	const yesBalance = useOptionalSignal<bigint>(undefined)
	const noBalance = useOptionalSignal<bigint>(undefined)
	const invalidBalance = useOptionalSignal<bigint>(undefined)
	const buySelected = useSignal<'Buy' | 'Sell'>('Buy')
	const yesSelected = useSignal<'Yes' | 'No'>('Yes')
	const expectedSharesOut = useOptionalSignal<bigint>(undefined)
	const expectedDaiOut = useOptionalSignal<bigint>(undefined)

	const canExitNoShareAmount = useOptionalSignal<bigint>(undefined)
	const canExitNoExpectedDai = useOptionalSignal<bigint>(undefined)

	const canExitYesShareAmount = useOptionalSignal<bigint>(undefined)
	const canExitYesExpectedDai = useOptionalSignal<bigint>(undefined)
	const currency = useComputed(() => yesSelected.value === 'Yes' ? <YesNameAndSymbol/> : <NoNameAndSymbol/>)
	const buttonName = useComputed(() => {
		if (buySelected.value === 'Buy') {
			if (yesSelected.value === 'Yes') {
				return `Buy YES shares ${ daiInputAmountToBuy.deepValue !== undefined ? `with ${ bigintToDecimalStringWithUnknown(daiInputAmountToBuy.deepValue, 18n, 2) } DAI` : '' }`
			}
			return `Buy NO shares ${ daiInputAmountToBuy.deepValue !== undefined ? `with ${ bigintToDecimalStringWithUnknown(daiInputAmountToBuy.deepValue, 18n, 2) } DAI` : '' }`
		} else {
			if (yesSelected.value === 'Yes') {
				if (sharesToSellInputAmount.deepValue === undefined) return `Sell YES shares for DAI`
				return `Sell ${ bigintToDecimalStringWithUnknown(sharesToSellInputAmount.deepValue, AUGUR_SHARE_DECIMALS, 2) } YES shares for DAI`
			}
			if (sharesToSellInputAmount.deepValue === undefined) return `Sell NO shares for DAI`
			return `Sell ${ bigintToDecimalStringWithUnknown(sharesToSellInputAmount.deepValue, AUGUR_SHARE_DECIMALS, 2) } No shares for DAI`
		}
	})

	const updateSharesOut = async (daiInput: bigint) => {
		if (maybeWriteClient.deepValue === undefined) return
		if (maybeReadClient.deepValue === undefined) return
		if (marketData.deepValue === undefined) return
		const baseSharesExpected = daiInput / marketData.deepValue.numTicks
		const expectedSwapShares = await expectedSharesAfterSwap(maybeReadClient.deepValue, marketData.deepValue.marketAddress, yesSelected.value === 'No', baseSharesExpected)
		expectedSharesOut.deepValue = baseSharesExpected + expectedSwapShares
	}

	useSignalEffect(() => {
		if (maybeWriteClient.deepValue === undefined) return
		if (maybeReadClient.deepValue === undefined) return
		if (marketData.deepValue === undefined) return

		if (buySelected.value === 'Buy') {
			if (daiInputAmountToBuy.deepValue === undefined) return
			// TODO, fix race conditions
			updateSharesOut(daiInputAmountToBuy.deepValue)
		} else {
			if (yesSelected.value === 'Yes') {
				console.error('TODO: not implemented')
			} else {
				console.error('TODO: not implemented')
			}
		}
	})

	const updateShareBalances = async () => {
		if (maybeWriteClient.deepValue === undefined) return
		if (marketData.deepValue === undefined) return
		const shareBalances = await getShareBalances(maybeWriteClient.deepValue, marketData.deepValue.marketAddress, maybeWriteClient.deepValue.account.address)
		invalidBalance.deepValue = shareBalances[0]
		noBalance.deepValue = shareBalances[1]
		yesBalance.deepValue = shareBalances[2]
	}

	useEffect(() => {
		updateShareBalances()
	}, [])

	useSignalEffect(() => {
		maybeWriteClient.deepValue
		maybeReadClient.deepValue
		marketData.deepValue
		invalidBalance.deepValue
		updateCanExits()
	})

	const updateCanExits = async () => {
		if (maybeWriteClient.deepValue === undefined) return
		if (maybeReadClient.deepValue === undefined) return
		if (marketData.deepValue === undefined) return
		if (invalidBalance.deepValue === undefined) return
		if (invalidBalance.deepValue > 4n) {
			canExitNoShareAmount.deepValue = undefined
			canExitNoExpectedDai.deepValue = undefined
			canExitNoShareAmount.deepValue = undefined
			canExitNoExpectedDai.deepValue = undefined

			// can exit no:
			const noSetsToSell = min(noBalance.deepValue || 0n, invalidBalance.deepValue) - 4n
			if (noSetsToSell > 0n) {
				const noNeededForSwap = await expectedSharesNeededForSwap(maybeReadClient.deepValue, marketData.deepValue.marketAddress, false, noSetsToSell)
				if (noNeededForSwap.success) {
					canExitNoShareAmount.deepValue = noSetsToSell + noNeededForSwap.result
					canExitNoExpectedDai.deepValue = noSetsToSell * marketData.deepValue.numTicks
				}
			}

			// can exit yes
			const yesSetsToSell = min(yesBalance.deepValue || 0n, invalidBalance.deepValue) - 4n
			if (yesSetsToSell > 0n) {
				const yesNeededForSwap = await expectedSharesNeededForSwap(maybeReadClient.deepValue, marketData.deepValue.marketAddress, true, yesSetsToSell)
				if (yesNeededForSwap.success) {
					canExitYesShareAmount.deepValue = yesSetsToSell + yesNeededForSwap.result
					canExitYesExpectedDai.deepValue = yesSetsToSell * marketData.deepValue.numTicks
				}
			}
		} else {
			canExitNoShareAmount.deepValue = 0n
			canExitNoExpectedDai.deepValue = 0n
			canExitYesShareAmount.deepValue = 0n
			canExitYesExpectedDai.deepValue = 0n
		}
	}

	const buyYes = async () => {
		if (maybeWriteClient.deepValue === undefined) return
		if (marketData.deepValue === undefined) return
		if (daiInputAmountToBuy.deepValue === undefined) return
		const aYearFromNow = currentTimeInBigIntSeconds.value + ONE_YEAR_IN_SECONDS
		const minSharesOut = 0n // TODO FIX
		await enterPosition(maybeWriteClient.deepValue, marketData.deepValue.marketAddress, daiInputAmountToBuy.deepValue, true, minSharesOut, aYearFromNow)
	}
	const buyNo = async () => {
		if (maybeWriteClient.deepValue === undefined) return
		if (marketData.deepValue === undefined) return
		if (daiInputAmountToBuy.deepValue === undefined) return
		const aYearFromNow = currentTimeInBigIntSeconds.value + ONE_YEAR_IN_SECONDS
		const minSharesOut = 0n // TODO FIX
		await enterPosition(maybeWriteClient.deepValue, marketData.deepValue.marketAddress, daiInputAmountToBuy.deepValue, false, minSharesOut, aYearFromNow)
	}
	const sellYes = async () => {
		if (maybeWriteClient.deepValue === undefined) return
		if (marketData.deepValue === undefined) return
		if (sharesToSellInputAmount.deepValue === undefined) return
		const aYearFromNow = currentTimeInBigIntSeconds.value + ONE_YEAR_IN_SECONDS
		const shareBalances = await getShareBalances(maybeWriteClient.deepValue, marketData.deepValue.marketAddress, maybeWriteClient.deepValue.account.address)
		const setsToSell = shareBalances[0] - 4n
		const yesNeededForSwap = await expectedSharesNeededForSwap(maybeWriteClient.deepValue, marketData.deepValue.marketAddress, true, setsToSell)
		if (!yesNeededForSwap.success) throw new Error('failed to exit')
		const yesSharesNeeded = setsToSell + yesNeededForSwap.result
		await exitPosition(maybeWriteClient.deepValue, marketData.deepValue.marketAddress, sharesToSellInputAmount.deepValue, yesSharesNeeded, aYearFromNow)
	}
	const sellNo = async () => {
		if (maybeWriteClient.deepValue === undefined) return
		if (marketData.deepValue === undefined) return
		if (sharesToSellInputAmount.deepValue === undefined) return
		const aYearFromNow = currentTimeInBigIntSeconds.value + ONE_YEAR_IN_SECONDS
		const shareBalances = await getShareBalances(maybeWriteClient.deepValue, marketData.deepValue.marketAddress, maybeWriteClient.deepValue.account.address)
		const setsToSell = shareBalances[0] - 4n
		const noNeededForSwap = await expectedSharesNeededForSwap(maybeWriteClient.deepValue, marketData.deepValue.marketAddress, false, setsToSell)
		if (!noNeededForSwap.success) throw new Error('failed to exit')
		const noSharesNeeded = setsToSell + noNeededForSwap.result
		await exitPosition(maybeWriteClient.deepValue, marketData.deepValue.marketAddress, sharesToSellInputAmount.deepValue, noSharesNeeded, aYearFromNow)
	}

	const execute = async () => {
		if (buySelected.value === 'Buy') {
			if (yesSelected.value === 'Yes') return await buyYes()
			return await buyNo()
		}
		if (yesSelected.value === 'Yes') return await sellYes()
		return await sellNo()
	}
	return <>
		<section>
			<ShareBalances yesBalance = { yesBalance } noBalance = {noBalance} invalidBalance = { invalidBalance }/>
			<div> canExitYes: { bigintToDecimalStringWithUnknown(canExitYesShareAmount.deepValue, AUGUR_SHARE_DECIMALS, 2) } YES for { bigintToDecimalStringWithUnknown(canExitYesExpectedDai.deepValue, 18n, 2) } DAI </div>
			<div> canExitNo: { bigintToDecimalStringWithUnknown(canExitNoShareAmount.deepValue, AUGUR_SHARE_DECIMALS, 2) } NO for { bigintToDecimalStringWithUnknown(canExitNoExpectedDai.deepValue, 18n, 2) } DAI </div>
		</section>
		<section>
			<h3>Trade</h3>
			<div>
				<Toggle selectedSignal = { buySelected } options = { ['Buy', 'Sell'] } style = { { width: '100%' } } buttonStyles = { [{ borderRadius: '10px 0px 0px 0px' }, { borderRadius: '0px 10px 0px 0px' }] }/>
			</div>
			<div>
				<Toggle selectedSignal = { yesSelected } options = { ['Yes', 'No'] }/>
			</div>
			{ buySelected.value === 'Buy' ? <>
				<div class = 'form-grid'>
					<h3>Amount</h3>
					<BigInputBox upperText = '' currency = { useComputed(() => <DaiNameAndSymbol/>) } style = { { width: '100%', minWidth: '100%'} } bottomElement = {
						<p class = 'gray-text'>Expected shares out: { bigintToDecimalStringWithUnknown(expectedSharesOut.deepValue, AUGUR_SHARE_DECIMALS, 2) }</p>
					}>
						<Input
							class = 'swap-amount'
							type = 'text'
							key = 'dai-to-sell'
							value = { daiInputAmountToBuy }
							sanitize = { (amount: string) => amount.trim() }
							tryParse = { (amount: string | undefined) => {
								if (amount === undefined) return { ok: false } as const
								if (!isDecimalString(amount.trim())) return { ok: false } as const
								const parsed = decimalStringToBigint(amount.trim(), 18n)
								return { ok: true, value: parsed } as const
							} }
							serialize = { (amount: NonHexBigInt | undefined) => {
								if (amount === undefined) return ''
								return bigintToDecimalString(amount, 18n, 18)
							} }
						/>
					</BigInputBox>
				</div>
			</> : <>
				<div class = 'form-grid'>
					<h3>Shares to sell</h3>
					<BigInputBox upperText = '' currency = { currency } style = { { width: '100%', minWidth: '100%'} } bottomElement = {
						<p class = 'gray-text'>Expected DAI out: { bigintToDecimalStringWithUnknown(expectedDaiOut.deepValue, 18n, 2) } DAI</p>
					}>
						<Input
							class = 'swap-amount'
							type = 'text'
							key = 'shares-to-sell'
							value = { sharesToSellInputAmount }
							sanitize = { (amount: string) => amount.trim() }
							tryParse = { (amount: string | undefined) => {
								if (amount === undefined) return { ok: false } as const
								if (!isDecimalString(amount.trim())) return { ok: false } as const
								const parsed = decimalStringToBigint(amount.trim(), AUGUR_SHARE_DECIMALS)
								return { ok: true, value: parsed } as const
							} }
							serialize = { (amount: NonHexBigInt | undefined) => {
								if (amount === undefined) return ''
								return bigintToDecimalString(amount, AUGUR_SHARE_DECIMALS, 18)
							} }
						/>
					</BigInputBox>
				</div>
			</> }
		</section>
		<section>
			<button class = 'button button-primary' style = { { width: '100%' } } onClick = { execute }>{ buttonName.value }</button>
		</section>
	</>
}

interface TradingProps {
	maybeReadClient: OptionalSignal<ReadClient>
	maybeWriteClient: OptionalSignal<WriteClient>
	universe: OptionalSignal<AccountAddress>
	reputationTokenAddress: OptionalSignal<AccountAddress>
	currentTimeInBigIntSeconds: Signal<bigint>
}

export const Trading = ({ maybeReadClient, maybeWriteClient, universe, reputationTokenAddress, currentTimeInBigIntSeconds }: TradingProps) => {
	const marketAddress = useOptionalSignal<AccountAddress>(undefined)
	const marketData = useOptionalSignal<MarketData>(undefined)
	const disputeWindowInfo = useOptionalSignal<Awaited<ReturnType<typeof getDisputeWindowInfo>>>(undefined)
	const forkValues = useOptionalSignal<Awaited<ReturnType<typeof getForkValues>>>(undefined)

	const isInvalidMarketAddress = useSignal<boolean>(false)
	const isRouterDeployed = useOptionalSignal<boolean>(undefined)
	const requiredDaiApproval = useOptionalSignal<bigint>(undefined)
	const daiApprovedForRouter = useOptionalSignal<bigint>(undefined)
	const sharesApprovedToRouter = useOptionalSignal<boolean>(undefined)

	const isConstantProductMarketDeployed = useOptionalSignal<boolean>(undefined)

	const clear = () => {
		marketData.deepValue = undefined
	}

	useSignalEffect(() => {
		if (marketAddress.deepValue === undefined) {
			clear()
		} else {
			refreshData()
		}
	})

	const refreshData = async () => {
		const readClient = maybeReadClient.deepPeek()
		if (readClient === undefined) throw new Error('missing readClient')
		isRouterDeployed.deepValue = await isAugurConstantProductMarketRouterDeployed(readClient)
		if (reputationTokenAddress.deepValue === undefined) throw new Error('missing reputationTokenAddress')
		if (isRouterDeployed.deepValue === false) return
		clear()
		if (marketAddress.deepValue === undefined) throw new Error('market not defined')
		marketData.deepValue = await fetchMarketData(readClient, marketAddress.deepValue)
		const disputeWindowAddress = await getDisputeWindow(readClient, marketAddress.deepValue)
		if (EthereumAddress.parse(disputeWindowAddress) !== 0n) {
			disputeWindowInfo.deepValue = await getDisputeWindowInfo(readClient, disputeWindowAddress)
		}
		forkValues.deepValue = await getForkValues(readClient, reputationTokenAddress.deepValue)

		isConstantProductMarketDeployed.deepValue = await isThereAugurConstantProductmarket(readClient, marketAddress.deepValue)

		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) throw new Error('missing writeClient')
		daiApprovedForRouter.deepValue = await getAllowanceErc20Token(writeClient, DAI_TOKEN_ADDRESS, writeClient.account.address, getAugurConstantProductMarketRouterAddress())
		const router = getAugurConstantProductMarketRouterAddress()
		sharesApprovedToRouter.deepValue = await isErc1155ApprovedForAll(readClient, AUGUR_SHARE_TOKEN, writeClient.account.address, router)
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
						value = { marketAddress }
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
				<TradingAndLiquidityProvidingAllowances maybeWriteClient = { maybeWriteClient } requiredDaiApproval = { requiredDaiApproval } allowedDai = { daiApprovedForRouter } sharesApprovedToRouter = { sharesApprovedToRouter }/>
				<TradingView maybeReadClient = { maybeReadClient } maybeWriteClient = { maybeWriteClient } marketData = { marketData } currentTimeInBigIntSeconds = { currentTimeInBigIntSeconds }/>
			</Market>
		</div>
	</div>
}
