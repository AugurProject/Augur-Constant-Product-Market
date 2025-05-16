import { Signal, useComputed, useSignal, useSignalEffect } from '@preact/signals'
import { ReadClient, WriteClient } from '../utils/ethereumWallet.js'
import { OptionalSignal, useOptionalSignal } from '../utils/OptionalSignal.js'
import { Market, MarketData } from '../SharedUI/Market.js'
import { AUGUR_SHARE_DECIMALS, AUGUR_SHARE_TOKEN, DAI_TOKEN_ADDRESS, ONE_YEAR_IN_SECONDS } from '../utils/constants.js'
import { burnLiquidity, getShareBalances, getTickSpacing, getUserLpTokenIdsAndBalancesForMarket, isErc1155ApprovedForAll, isThereAugurConstantProductMarket, mintLiquidity, roundToClosestPrice } from '../utils/augurConstantProductMarketUtils.js'
import { Input } from '../SharedUI/Input.js'
import { bigintToDecimalString, decimalStringToBigint, isDecimalString } from '../utils/ethereumUtils.js'
import { AccountAddress, EthereumAddress, NonHexBigInt } from '../types/types.js'
import { DeployAugurConstantProductMarket, DeployRouter } from '../SharedUI/deploy.js'
import { getAllowanceErc20Token } from '../utils/erc20.js'
import { fetchMarketData, getDisputeWindow, getDisputeWindowInfo, getForkValues } from '../utils/augurContractUtils.js'
import { TradingAndLiquidityProvidingAllowances } from '../SharedUI/TradingAndLiquidityProvidingAllowances.js'
import { DaiNameAndSymbol } from '../SharedUI/tokens.js'
import { BigInputBox } from '../SharedUI/BigInputBox.js'
import { getAugurConstantProductMarketRouterAddress, isAugurConstantProductMarketRouterDeployed } from '../utils/augurDeployment.js'
import { tickToZeroToOnePrice, zeroOnePriceToTick } from '../utils/uniswapUtils.js'
import { ShareBalances } from '../SharedUI/ShareBalances.js'
import { useSignalEffectWithAbortOnChange } from '../utils/SignalEffectWithAbortOnChange.js'

interface LiquidityTokensProps {
	liquidityTokens: OptionalSignal<Awaited<ReturnType<typeof getUserLpTokenIdsAndBalancesForMarket>>>
	maybeWriteClient: OptionalSignal<WriteClient>
	marketData: OptionalSignal<MarketData>
	currentTimeInBigIntSeconds: Signal<bigint>
	updateShareBalances: () => Promise<void>
}

const LiquidityTokens = ({ liquidityTokens, maybeWriteClient, marketData, currentTimeInBigIntSeconds, updateShareBalances }: LiquidityTokensProps) => {
	if (liquidityTokens.deepValue === undefined) {
		return <section>
			<h3>Liquidity Positions</h3>
			<p> loading...</p>
		</section>
	}
	if (liquidityTokens.deepValue.length === 0) {
		return <section>
			<h3>Liquidity Positions</h3>
			<p> No Positions</p>
		</section>
	}
	const closePosition = async (tokenId: bigint) => {
		if (maybeWriteClient.deepValue === undefined) return
		if (marketData.deepValue === undefined) return
		if (liquidityTokens.deepValue === undefined) return
		const amountNoMin = 0n // TODO, add slippage calculations
		const amountYesMin = 0n // TODO, add slippage calculations
		const aYearFromNow = currentTimeInBigIntSeconds.value + ONE_YEAR_IN_SECONDS
		await burnLiquidity(maybeWriteClient.deepValue, marketData.deepValue.marketAddress, tokenId, amountNoMin, amountYesMin, aYearFromNow)
		liquidityTokens.deepValue = liquidityTokens.deepValue.filter((token) => token.tokenId !== tokenId)
		await updateShareBalances()
	}
	return <section>
		<h3>Liquidity Positions</h3>
		<div style = 'display: grid; grid-template-columns: auto auto auto auto auto;'>
			{ liquidityTokens.deepValue.map((token) => <>
				<p>TokenId: { token.tokenId }</p>
				<p>Liquidity: { bigintToDecimalString(token.liquidityBalance, AUGUR_SHARE_DECIMALS, 2) } Liquidity</p>
				<p>Lower Price: { Math.round(tickToZeroToOnePrice(token.positionInfo.tickLower) * 100) / 100 } DAI</p>
				<p>Upper Price: { Math.round(tickToZeroToOnePrice(token.positionInfo.tickUpper) * 100) / 100 } DAI</p>
				<button class = 'button button-secondary button-small' style = { { width: '100%', whiteSpace: 'nowrap' } } onClick = { () => closePosition(token.tokenId) }>
					Close
				</button>
			</>)
		} </div>
	</section>
}

interface LiquidityProvidingProps {
	maybeWriteClient: OptionalSignal<WriteClient>
	marketData: OptionalSignal<MarketData>
	currentTimeInBigIntSeconds: Signal<bigint>
	updateShareBalances: () => Promise<void>
	tickSpacing: Signal<number>
}

export const LiquidityProviding = ({ maybeWriteClient, marketData, currentTimeInBigIntSeconds, updateShareBalances, tickSpacing }: LiquidityProvidingProps) => {
	const tokenInputAmount = useOptionalSignal<bigint>(0n)
	const liquidityLower = useOptionalSignal<number>(0)
	const liquidityUpper = useOptionalSignal<number>(1)

	const mintLiquidityButton = async () => {
		if (maybeWriteClient.deepValue === undefined) return
		if (marketData.deepValue === undefined) return
		if (tokenInputAmount.deepValue === undefined) return
		if (liquidityLower.deepValue === undefined) return
		if (liquidityUpper.deepValue === undefined) return
		if (liquidityLower.deepValue > liquidityUpper.deepValue) return
		const aYearFromNow = currentTimeInBigIntSeconds.value + ONE_YEAR_IN_SECONDS
		const setsToBuy = tokenInputAmount.deepValue / marketData.deepValue.numTicks
		const amountYesMax = setsToBuy
		const amountNoMax = setsToBuy

		const tickLower = zeroOnePriceToTick(liquidityLower.deepValue, tickSpacing.value)
		const tickUpper = zeroOnePriceToTick(liquidityUpper.deepValue, tickSpacing.value)
		await mintLiquidity(maybeWriteClient.deepValue, marketData.deepValue.marketAddress, setsToBuy, tickLower, tickUpper, amountNoMax, amountYesMax, aYearFromNow)
		await updateShareBalances()
	}
	return <>
		<section>
			<div class = 'form-grid'>
				<h3>Set Price Range</h3>
				<div class = 'price-range-grid'>
					<BigInputBox upperText = 'Min Liquidity' currency = { useComputed(() => <DaiNameAndSymbol/>) } style = { { borderRadius: '20px 0px 0px 20px' } }>
						<Input
							class = 'swap-amount'
							type = 'text'
							value = { liquidityLower }
							sanitize = { (amount: string) => amount.trim() }
							tryParse = { (amount: string | undefined) => {
								if (amount === undefined) return { ok: false } as const
								if (!isDecimalString(amount.trim())) return { ok: false } as const
								const rounded = roundToClosestPrice(Number(amount.trim()), tickSpacing.value)
								if (rounded < 0 || rounded > 1) return { ok: false } as const
								return { ok: true, value: Math.round(rounded * 100) / 100 } as const
							} }
							serialize = { (amount: number | undefined) => {
								if (amount === undefined) return ''
								return amount.toString()
							} }
							invalidSignal = { useSignal(false) }
						/>
					</BigInputBox>
					<BigInputBox upperText = 'Max Liquidity' currency = { useComputed(() => <DaiNameAndSymbol/>) } style = { { borderRadius: '0px 20px 20px 0px' } }>
						<Input
							class = 'swap-amount'
							type = 'text'
							value = { liquidityUpper }
							sanitize = { (amount: string) => amount.trim() }
							tryParse = { (amount: string | undefined) => {
								if (amount === undefined) return { ok: false } as const
								if (!isDecimalString(amount.trim())) return { ok: false } as const
								const rounded = roundToClosestPrice(Number(amount.trim()), tickSpacing.value)
								if (rounded < 0 || rounded > 1) return { ok: false } as const
								return { ok: true, value: Math.round(rounded * 100) / 100 } as const
							} }
							serialize = { (amount: number | undefined) => {
								if (amount === undefined) return ''
								return amount.toString()
							} }
							invalidSignal = { useSignal(false) }
						/>
					</BigInputBox>
				</div>
			</div>
		</section>
		<section>
			<div class = 'form-grid'>
				<h3>Set Deposit Amount</h3>
				<BigInputBox upperText = '' currency = { useComputed(() => <DaiNameAndSymbol/>) } style = { { width: '100%', minWidth: '100%'} }>
					<Input
						class = 'swap-amount'
						type = 'text'
						value = { tokenInputAmount }
						sanitize = { (amount: string) => amount.trim() }
						tryParse = { (amount: string | undefined) => {
							if (amount === undefined) return { ok: false } as const
							if (!isDecimalString(amount.trim())) return { ok: false } as const
							const parsed = decimalStringToBigint(amount.trim(), 18n)
							return { ok: true, value: parsed } as const
						} }
						serialize = { (amount: NonHexBigInt | undefined) => {
							if (amount === undefined) return ''
							return bigintToDecimalString(amount, 18n, 3)
						} }
						invalidSignal = { useSignal(false) }
					/>
				</BigInputBox>
			</div>
		</section>
		<section>
			<button class = 'button button-primary' style = 'width: 100%;' onClick = { mintLiquidityButton }>Provide Liquidity</button>
		</section>
	</>
}

interface LiquidityProps {
	maybeReadClient: OptionalSignal<ReadClient>
	maybeWriteClient: OptionalSignal<WriteClient>
	universe: OptionalSignal<AccountAddress>
	forkValues: OptionalSignal<Awaited<ReturnType<typeof getForkValues>>>
	currentTimeInBigIntSeconds: Signal<bigint>
	selectedMarket: OptionalSignal<AccountAddress>
}

export const Liquidity = ({ maybeReadClient, maybeWriteClient, universe, forkValues, currentTimeInBigIntSeconds, selectedMarket }: LiquidityProps) => {
	const marketData = useOptionalSignal<MarketData>(undefined)
	const disputeWindowInfo = useOptionalSignal<Awaited<ReturnType<typeof getDisputeWindowInfo>>>(undefined)

	const isInvalidMarketAddress = useSignal<boolean>(false)
	const isRouterDeployed = useOptionalSignal<boolean>(undefined)
	const requiredDaiApproval = useOptionalSignal<bigint>(undefined)
	const daiApprovedForRouter = useOptionalSignal<bigint>(undefined)
	const sharesApprovedToRouter = useOptionalSignal<boolean>(undefined)
	const liquidityTokens = useOptionalSignal<Awaited<ReturnType<typeof getUserLpTokenIdsAndBalancesForMarket>>>(undefined)

	const yesBalance = useOptionalSignal<bigint>(undefined)
	const noBalance = useOptionalSignal<bigint>(undefined)
	const invalidBalance = useOptionalSignal<bigint>(undefined)

	const isConstantProductMarketDeployed = useOptionalSignal<boolean>(undefined)

	const tickSpacing = useSignal<number>(1000)

	useSignalEffect(() => {
		selectedMarket.deepValue // when user changes the market, we should clear all market related stuff right away

		marketData.deepValue = undefined
		isConstantProductMarketDeployed.deepValue = undefined
		liquidityTokens.deepValue = undefined
		yesBalance.deepValue = undefined
		noBalance.deepValue = undefined
		invalidBalance.deepValue = undefined
		disputeWindowInfo.deepValue = undefined
	})

	const refreshMarketData = async (maybeReadClient: ReadClient | undefined, selectedMarket: AccountAddress | undefined, isRouterDeployed: boolean | undefined) => {
		if (maybeReadClient === undefined) return
		if (isRouterDeployed !== true) return
		if (selectedMarket === undefined) return
		console.log('refresh market')
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
	const updateTickSpacing = async (maybeReadClient: ReadClient | undefined, isRouterDeployed: boolean | undefined ) => {
		if (maybeReadClient === undefined) return
		if (isRouterDeployed !== true) return // router needs to be deployed for this call to work
		tickSpacing.value = await getTickSpacing(maybeReadClient)
	}
	useSignalEffectWithAbortOnChange([maybeReadClient, isRouterDeployed] as const, (_abortSignal, ...params) => updateTickSpacing(...params), console.error)

	useSignalEffectWithAbortOnChange([maybeReadClient] as const, (_abortSignal, ...params) => checkIfRouterIsDeployed(...params), console.error)

	const refreshData = async () => {
		await refreshMarketData(maybeReadClient.deepValue, selectedMarket.deepValue, isRouterDeployed.deepValue)
		await updateShareBalances(maybeWriteClient.deepValue, marketData.deepValue, isConstantProductMarketDeployed.deepValue)
	}

	const updateAccountSpecificSignals = async (maybeWriteClient: WriteClient | undefined) => {
		if (maybeWriteClient === undefined) return
		const router = getAugurConstantProductMarketRouterAddress()
		daiApprovedForRouter.deepValue = await getAllowanceErc20Token(maybeWriteClient, DAI_TOKEN_ADDRESS, maybeWriteClient.account.address, router)
		sharesApprovedToRouter.deepValue = await isErc1155ApprovedForAll(maybeWriteClient, AUGUR_SHARE_TOKEN, maybeWriteClient.account.address, router)
	}
	useSignalEffectWithAbortOnChange([maybeWriteClient] as const, (_abortSignal, ...params) => updateAccountSpecificSignals(...params), console.error)

	const updateLPTokens = async (maybeWriteClient: WriteClient | undefined, marketData: MarketData | undefined) => {
		if (maybeWriteClient === undefined) return
		if (marketData === undefined) return
		liquidityTokens.deepValue = await getUserLpTokenIdsAndBalancesForMarket(maybeWriteClient, marketData.marketAddress, maybeWriteClient.account.address)
	}

	useSignalEffectWithAbortOnChange([maybeWriteClient, marketData] as const, (_abortSignal, ...params) => updateLPTokens(...params), console.error)

	const updateShareBalancesButton = async () => {
		await updateShareBalances(maybeWriteClient.deepValue, marketData.deepValue, isConstantProductMarketDeployed.deepValue)
		await updateLPTokens(maybeWriteClient.deepValue, marketData.deepValue)
	}
	const updateShareBalances = async (maybeWriteClient: WriteClient | undefined, marketData: MarketData | undefined, isConstantProductMarketDeployed: boolean | undefined) => {
		if (maybeWriteClient === undefined) return
		if (marketData === undefined) return
		if (isConstantProductMarketDeployed !== true) return
		const shareBalances = await getShareBalances(maybeWriteClient, marketData.marketAddress, maybeWriteClient.account.address)
		invalidBalance.deepValue = shareBalances[0]
		noBalance.deepValue = shareBalances[1]
		yesBalance.deepValue = shareBalances[2]
	}

	useSignalEffectWithAbortOnChange([maybeWriteClient, marketData, isConstantProductMarketDeployed] as const, (_abortSignal, ...params) => updateShareBalances(...params), console.error)

	return <div class = 'subApplication'>
		<DeployRouter isRouterDeployed = { isRouterDeployed } maybeWriteClient = { maybeWriteClient }/>
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
				<DeployAugurConstantProductMarket maybeWriteClient = { maybeWriteClient } isConstantProductMarketDeployed = { isConstantProductMarketDeployed } marketAddress = { selectedMarket }/>
				<TradingAndLiquidityProvidingAllowances maybeWriteClient = { maybeWriteClient } requiredDaiApproval = { requiredDaiApproval } allowedDai = { daiApprovedForRouter } sharesApprovedToRouter = { sharesApprovedToRouter }/>
				<LiquidityTokens liquidityTokens = { liquidityTokens } maybeWriteClient = { maybeWriteClient } marketData = { marketData } currentTimeInBigIntSeconds = { currentTimeInBigIntSeconds } updateShareBalances = { updateShareBalancesButton }/>
				<ShareBalances yesBalance = { yesBalance } noBalance = { noBalance } invalidBalance = { invalidBalance }/>
				<LiquidityProviding maybeWriteClient = { maybeWriteClient } marketData = { marketData } currentTimeInBigIntSeconds = { currentTimeInBigIntSeconds } updateShareBalances = { updateShareBalancesButton } tickSpacing = { tickSpacing }/>
			</Market>
		</div>
	</div>
}
