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
import { useEffect } from 'preact/hooks'
import { BigInputBox } from '../SharedUI/BigInputBox.js'
import { getAugurConstantProductMarketRouterAddress, isAugurConstantProductMarketRouterDeployed } from '../utils/augurDeployment.js'
import { tickToZeroToOnePrice, zeroOnePriceToTick } from '../utils/uniswapUtils.js'
import { ShareBalances } from '../SharedUI/ShareBalances.js'

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
	maybeReadClient: OptionalSignal<ReadClient>
	maybeWriteClient: OptionalSignal<WriteClient>
	marketData: OptionalSignal<MarketData>
	currentTimeInBigIntSeconds: Signal<bigint>
	updateShareBalances: () => Promise<void>
}

export const LiquidityProviding = ({ maybeReadClient, maybeWriteClient, marketData, currentTimeInBigIntSeconds, updateShareBalances }: LiquidityProvidingProps) => {
	const tokenInputAmount = useOptionalSignal<bigint>(0n)
	const liquidityLower = useOptionalSignal<number>(0)
	const liquidityUpper = useOptionalSignal<number>(1)
	const tickSpacing = useSignal<number>(1000)

	useSignalEffect(() => {
		maybeWriteClient.deepValue
		refresh()
	})

	useEffect(() => { refresh() }, [])

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
	const refresh = async () => {
		if (maybeReadClient.deepValue === undefined) return
		tickSpacing.value = await getTickSpacing(maybeReadClient.deepValue)
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

	const clear = () => {
		marketData.deepValue = undefined
	}
	useSignalEffect(() => {
		selectedMarket.deepValue
		clear()
	})

	useSignalEffect(() => {
		maybeWriteClient.deepValue
		maybeReadClient.deepValue
		selectedMarket.deepValue

		refreshData()
	})

	const refreshData = async () => {
		if (maybeReadClient.deepValue === undefined) return
		isRouterDeployed.deepValue = await isAugurConstantProductMarketRouterDeployed(maybeReadClient.deepValue)
		if (isRouterDeployed.deepValue === false) return
		if (selectedMarket.deepValue === undefined) return
		marketData.deepValue = await fetchMarketData(maybeReadClient.deepValue, selectedMarket.deepValue)
		const disputeWindowAddress = await getDisputeWindow(maybeReadClient.deepValue, selectedMarket.deepValue)
		if (EthereumAddress.parse(disputeWindowAddress) !== 0n) {
			disputeWindowInfo.deepValue = await getDisputeWindowInfo(maybeReadClient.deepValue, disputeWindowAddress)
		}

		isConstantProductMarketDeployed.deepValue = await isThereAugurConstantProductMarket(maybeReadClient.deepValue, selectedMarket.deepValue)

		if (maybeWriteClient.deepValue === undefined) return
		daiApprovedForRouter.deepValue = await getAllowanceErc20Token(maybeWriteClient.deepValue, DAI_TOKEN_ADDRESS, maybeWriteClient.deepValue.account.address, getAugurConstantProductMarketRouterAddress())
		const router = getAugurConstantProductMarketRouterAddress()
		sharesApprovedToRouter.deepValue = await isErc1155ApprovedForAll(maybeReadClient.deepValue, AUGUR_SHARE_TOKEN, maybeWriteClient.deepValue.account.address, router)

		liquidityTokens.deepValue = await getUserLpTokenIdsAndBalancesForMarket(maybeReadClient.deepValue, marketData.deepValue.marketAddress, maybeWriteClient.deepValue.account.address)
	}

	const updateShareBalances = async () => {
		if (maybeWriteClient.deepValue === undefined) return
		if (marketData.deepValue === undefined) return
		if (isConstantProductMarketDeployed.deepValue !== true) return
		const shareBalances = await getShareBalances(maybeWriteClient.deepValue, marketData.deepValue.marketAddress, maybeWriteClient.deepValue.account.address)
		invalidBalance.deepValue = shareBalances[0]
		noBalance.deepValue = shareBalances[1]
		yesBalance.deepValue = shareBalances[2]
	}

	useSignalEffect(() => {
		if (maybeWriteClient.deepValue === undefined) return
		if (marketData.deepValue === undefined) return
		if (isConstantProductMarketDeployed.deepValue !== true) return
		updateShareBalances()
	})

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
				<LiquidityTokens liquidityTokens = { liquidityTokens } maybeWriteClient = { maybeWriteClient } marketData = { marketData } currentTimeInBigIntSeconds = { currentTimeInBigIntSeconds } updateShareBalances = { updateShareBalances }/>
				<ShareBalances yesBalance = { yesBalance } noBalance = {noBalance} invalidBalance = { invalidBalance }/>
				<LiquidityProviding maybeReadClient = { maybeReadClient } maybeWriteClient = { maybeWriteClient } marketData = { marketData } currentTimeInBigIntSeconds = { currentTimeInBigIntSeconds } updateShareBalances = { updateShareBalances }/>
			</Market>
		</div>
	</div>
}
