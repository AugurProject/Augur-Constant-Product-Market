import { OptionalSignal, useOptionalSignal } from '../utils/OptionalSignal.js'
import { fetchMarketData, getDisputeWindow, getDisputeWindowInfo, getForkValues } from '../utils/augurContractUtils.js'
import { Signal, useComputed, useSignal, useSignalEffect } from '@preact/signals'
import { AccountAddress, EthereumAddress, NonHexBigInt } from '../types/types.js'
import { Market, MarketData } from '../SharedUI/Market.js'
import { ReadClient, WriteClient } from '../utils/ethereumWallet.js'
import { Input } from '../SharedUI/Input.js'
import { enterPosition, exitPosition, expectedSharesAfterSwap, expectedSharesNeededForSwap, getShareBalances, isErc1155ApprovedForAll, isThereAugurConstantProductMarket } from '../utils/augurConstantProductMarketUtils.js'
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
import { useSignalEffectWithAbortOnChange } from '../utils/SignalEffectWithAbortOnChange.js'

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

	const updateSharesOut = async (buySelected: 'Buy' | 'Sell', maybeReadClient: ReadClient | undefined, marketData: MarketData | undefined, daiInput: bigint | undefined) => {
		expectedSharesOut.deepValue = undefined
		if (buySelected === 'Buy') {
			if (daiInput === undefined) return
			if (marketData === undefined) return
			if (maybeReadClient === undefined) return
			const baseSharesExpected = daiInput / marketData.numTicks
			const expectedSwapShares = await expectedSharesAfterSwap(maybeReadClient, marketData.marketAddress, yesSelected.value === 'No', baseSharesExpected)
			expectedSharesOut.deepValue = baseSharesExpected + expectedSwapShares
		} else {
			if (yesSelected.value === 'Yes') {
				console.error('TODO: not implemented')
			} else {
				console.error('TODO: not implemented')
			}
		}
	}

	useSignalEffectWithAbortOnChange([buySelected, maybeReadClient, marketData, daiInputAmountToBuy] as const, (_abortSignal, ...params) => updateSharesOut(...params), console.error)

	const updateShareBalances = async (maybeWriteClient: WriteClient | undefined, marketData: MarketData | undefined) => {
		if (maybeWriteClient === undefined) return
		if (marketData === undefined) return
		const shareBalances = await getShareBalances(maybeWriteClient, marketData.marketAddress, maybeWriteClient.account.address)
		invalidBalance.deepValue = shareBalances[0]
		noBalance.deepValue = shareBalances[1]
		yesBalance.deepValue = shareBalances[2]
	}

	useSignalEffectWithAbortOnChange([maybeWriteClient, marketData] as const, (_abortSignal, ...params) => updateShareBalances(...params), console.error)

	const updateCanExits = async (maybeReadClient: ReadClient | undefined, marketData: MarketData | undefined, invalidBalance: bigint | undefined) => {
		if (maybeReadClient === undefined) return
		if (marketData === undefined) return
		if (invalidBalance === undefined) return
		if (invalidBalance > 4n) {
			canExitNoShareAmount.deepValue = undefined
			canExitNoExpectedDai.deepValue = undefined
			canExitNoShareAmount.deepValue = undefined
			canExitNoExpectedDai.deepValue = undefined

			// can exit no:
			const noSetsToSell = min(noBalance.deepValue || 0n, invalidBalance) - 4n
			if (noSetsToSell > 0n) {
				const noNeededForSwap = await expectedSharesNeededForSwap(maybeReadClient, marketData.marketAddress, false, noSetsToSell)
				if (noNeededForSwap.success) {
					canExitNoShareAmount.deepValue = noSetsToSell + noNeededForSwap.result
					canExitNoExpectedDai.deepValue = noSetsToSell * marketData.numTicks
				}
			}

			// can exit yes
			const yesSetsToSell = min(yesBalance.deepValue || 0n, invalidBalance) - 4n
			if (yesSetsToSell > 0n) {
				const yesNeededForSwap = await expectedSharesNeededForSwap(maybeReadClient, marketData.marketAddress, true, yesSetsToSell)
				if (yesNeededForSwap.success) {
					canExitYesShareAmount.deepValue = yesSetsToSell + yesNeededForSwap.result
					canExitYesExpectedDai.deepValue = yesSetsToSell * marketData.numTicks
				}
			}
		} else {
			canExitNoShareAmount.deepValue = 0n
			canExitNoExpectedDai.deepValue = 0n
			canExitYesShareAmount.deepValue = 0n
			canExitYesExpectedDai.deepValue = 0n
		}
	}

	useSignalEffectWithAbortOnChange([maybeReadClient, marketData, invalidBalance] as const, (_abortSignal, ...params) => updateCanExits(...params), console.error)

	const buyYes = async () => {
		if (maybeWriteClient.deepValue === undefined) return
		if (marketData.deepValue === undefined) return
		if (daiInputAmountToBuy.deepValue === undefined) return
		const aYearFromNow = currentTimeInBigIntSeconds.value + ONE_YEAR_IN_SECONDS
		const minSharesOut = 0n // TODO FIX
		await enterPosition(maybeWriteClient.deepValue, marketData.deepValue.marketAddress, daiInputAmountToBuy.deepValue, true, minSharesOut, aYearFromNow)
		await updateShareBalances(maybeWriteClient.deepValue, marketData.deepValue)
	}
	const buyNo = async () => {
		if (maybeWriteClient.deepValue === undefined) return
		if (marketData.deepValue === undefined) return
		if (daiInputAmountToBuy.deepValue === undefined) return
		const aYearFromNow = currentTimeInBigIntSeconds.value + ONE_YEAR_IN_SECONDS
		const minSharesOut = 0n // TODO FIX
		await enterPosition(maybeWriteClient.deepValue, marketData.deepValue.marketAddress, daiInputAmountToBuy.deepValue, false, minSharesOut, aYearFromNow)
		await updateShareBalances(maybeWriteClient.deepValue, marketData.deepValue)
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
		await updateShareBalances(maybeWriteClient.deepValue, marketData.deepValue)
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
		await updateShareBalances(maybeWriteClient.deepValue, marketData.deepValue)
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
						<p class = 'gray-text'>Expected shares out: { bigintToDecimalStringWithUnknown(expectedSharesOut.deepValue, AUGUR_SHARE_DECIMALS, 2) } { yesSelected.value === 'Yes' ? 'YES' : 'NO' }.</p>
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
	currentTimeInBigIntSeconds: Signal<bigint>
	selectedMarket: OptionalSignal<AccountAddress>
	forkValues: OptionalSignal<Awaited<ReturnType<typeof getForkValues>>>
}

export const Trading = ({ maybeReadClient, maybeWriteClient, universe, forkValues, currentTimeInBigIntSeconds, selectedMarket }: TradingProps) => {
	const marketData = useOptionalSignal<MarketData>(undefined)
	const disputeWindowInfo = useOptionalSignal<Awaited<ReturnType<typeof getDisputeWindowInfo>>>(undefined)

	const isInvalidMarketAddress = useSignal<boolean>(false)
	const isRouterDeployed = useOptionalSignal<boolean>(undefined)
	const requiredDaiApproval = useOptionalSignal<bigint>(undefined)
	const daiApprovedForRouter = useOptionalSignal<bigint>(undefined)
	const sharesApprovedToRouter = useOptionalSignal<boolean>(undefined)

	const isConstantProductMarketDeployed = useOptionalSignal<boolean>(undefined)

	useSignalEffect(() => {
		selectedMarket.deepValue // clear market related fields when user changes market address

		marketData.deepValue = undefined
		disputeWindowInfo.deepValue = undefined
		isConstantProductMarketDeployed.deepValue = undefined
	})

	const refreshMarketData = async (maybeReadClient: ReadClient | undefined, selectedMarket: AccountAddress | undefined, isRouterDeployed: boolean | undefined) => {
		if (maybeReadClient === undefined) return
		if (isRouterDeployed !== true) return
		if (selectedMarket === undefined) return
		isConstantProductMarketDeployed.deepValue = await isThereAugurConstantProductMarket(maybeReadClient, selectedMarket)
		marketData.deepValue = await fetchMarketData(maybeReadClient, selectedMarket)
		const disputeWindowAddress = await getDisputeWindow(maybeReadClient, selectedMarket)
		if (EthereumAddress.parse(disputeWindowAddress) !== 0n) {
			disputeWindowInfo.deepValue = await getDisputeWindowInfo(maybeReadClient, disputeWindowAddress)
		} else {
			disputeWindowInfo.deepValue = undefined
		}
	}

	useSignalEffectWithAbortOnChange([maybeReadClient, selectedMarket, isRouterDeployed] as const, (_abortSignal, ...params) => refreshMarketData(...params), console.error)

	const checkIfRouterIsDeployed = async (maybeReadClient: ReadClient | undefined) => {
		if (maybeReadClient === undefined) return
		isRouterDeployed.deepValue = await isAugurConstantProductMarketRouterDeployed(maybeReadClient)
	}

	useSignalEffectWithAbortOnChange([maybeReadClient] as const, (_abortSignal, ...params) => checkIfRouterIsDeployed(...params), console.error)

	const refreshData = async () => {
		await refreshMarketData(maybeReadClient.deepValue, selectedMarket.deepValue, isRouterDeployed.deepValue)
	}

	const updateAccountSpecificSignals = async (maybeWriteClient: WriteClient | undefined) => {
		if (maybeWriteClient === undefined) return
		const router = getAugurConstantProductMarketRouterAddress()
		daiApprovedForRouter.deepValue = await getAllowanceErc20Token(maybeWriteClient, DAI_TOKEN_ADDRESS, maybeWriteClient.account.address, router)
		sharesApprovedToRouter.deepValue = await isErc1155ApprovedForAll(maybeWriteClient, AUGUR_SHARE_TOKEN, maybeWriteClient.account.address, router)
	}
	useSignalEffectWithAbortOnChange([maybeWriteClient] as const, (_abortSignal, ...params) => updateAccountSpecificSignals(...params), console.error)

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
				{ isConstantProductMarketDeployed.deepValue === false ? <p> There's no pool for this market</p> : <>
					{ isConstantProductMarketDeployed.deepValue === undefined ? <p> Loading... </p> : <>
						<TradingAndLiquidityProvidingAllowances maybeWriteClient = { maybeWriteClient } requiredDaiApproval = { requiredDaiApproval } allowedDai = { daiApprovedForRouter } sharesApprovedToRouter = { sharesApprovedToRouter }/>
						<TradingView maybeReadClient = { maybeReadClient } maybeWriteClient = { maybeWriteClient } marketData = { marketData } currentTimeInBigIntSeconds = { currentTimeInBigIntSeconds }/>
					</> }
				</> }
			</Market>
		</div>
	</div>
}
