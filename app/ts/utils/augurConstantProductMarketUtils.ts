import { mainnet } from 'viem/chains'
import { AugurConstantProductRouter, IPositionManager } from '../VendoredAugurConstantProductMarket.js'
import { ReadClient, WriteClient } from './ethereumWallet'
import { UNIV4_POSITION_MANAGER, ZERO_ADDRESS } from './constants.js'
import { AccountAddress, EthereumQuantity } from '../types/types.js'
import { ERC1155_ABI } from '../ABI/Erc1155.js'
import { getAugurConstantProductMarketRouterAddress, isAugurConstantProductMarketRouterDeployed } from './augurDeployment.js'
import { parsePositionInfo } from './uniswapUtils.js'

export const getAugurConstantProductMarket = async (client: ReadClient, marketAddress: AccountAddress) => {
	return await client.readContract({
		abi: AugurConstantProductRouter.abi,
		functionName: 'marketIds',
		address: getAugurConstantProductMarketRouterAddress(),
		args: [marketAddress]
	})
}

export const isThereAugurConstantProductMarket = async (client: ReadClient, marketAddress: AccountAddress) => {
	return (await getAugurConstantProductMarket(client, marketAddress))[0] !== ZERO_ADDRESS
}

export const deployAugurConstantProductMarket = async (client: WriteClient, marketAddress: AccountAddress) => {
	if (!await (isAugurConstantProductMarketRouterDeployed(client))) throw new Error('router doesnt exist')
	if (await (isThereAugurConstantProductMarket(client, marketAddress))) throw new Error('market already exists')
	return await client.writeContract({
		chain: mainnet,
		abi: AugurConstantProductRouter.abi,
		functionName: 'createACPM',
		address: getAugurConstantProductMarketRouterAddress(),
		args: [marketAddress]
	})
}

export const getExpectedLiquidity = async (client: ReadClient, marketAddress: AccountAddress, tickLower: number, tickUpper: number, amountNo: EthereumQuantity, amountYes: EthereumQuantity) => {
	return await client.readContract({
		abi: AugurConstantProductRouter.abi,
		functionName: 'getExpectedLiquidity',
		address: getAugurConstantProductMarketRouterAddress(),
		args: [marketAddress, tickLower, tickUpper, amountNo, amountYes]
	})
}

export const getNumMarkets = async (client: ReadClient) => {
	return await client.readContract({
		abi: AugurConstantProductRouter.abi,
		functionName: 'getNumMarkets',
		address: getAugurConstantProductMarketRouterAddress(),
		args: []
	})
}

export const getMarkets = async (client: ReadClient, startIndex: EthereumQuantity, pageSize: EthereumQuantity) => {
	return await client.readContract({
		abi: AugurConstantProductRouter.abi,
		functionName: 'getMarkets',
		address: getAugurConstantProductMarketRouterAddress(),
		args: [startIndex, pageSize]
	})
}

export const getShareBalances = async (client: ReadClient, marketAddress: AccountAddress, owner: AccountAddress) => {
	return await client.readContract({
		abi: AugurConstantProductRouter.abi,
		functionName: 'getShareBalances',
		address: getAugurConstantProductMarketRouterAddress(),
		args: [marketAddress, owner]
	})
}

export const getPoolKey = async (client: ReadClient, marketAddress: AccountAddress) => {
	return await client.readContract({
		abi: AugurConstantProductRouter.abi,
		functionName: 'marketIds',
		address: getAugurConstantProductMarketRouterAddress(),
		args: [marketAddress]
	})
}

export const getNextPositionManagerToken = async (client: ReadClient) => {
	return await client.readContract({
		abi: IPositionManager.abi,
		functionName: 'nextTokenId',
		address: UNIV4_POSITION_MANAGER,
		args: []
	})
}

export const getPoolLiquidityBalance = async (client: ReadClient, tokenId: EthereumQuantity) => {
	return await client.readContract({
		abi: IPositionManager.abi,
		functionName: 'getPositionLiquidity',
		address: UNIV4_POSITION_MANAGER,
		args: [tokenId]
	})
}

export const getLastPositionInfo = async (client: ReadClient) => {
	const nextTokenId = await client.readContract({
		abi: IPositionManager.abi,
		functionName: 'nextTokenId',
		address: UNIV4_POSITION_MANAGER,
		args: []
	})
	return await client.readContract({
		abi: IPositionManager.abi,
		functionName: 'getPositionLiquidity',
		address: UNIV4_POSITION_MANAGER,
		args: [nextTokenId - 1n]
	})
}

export const getShareWrappers = async (client: ReadClient, marketAddress: AccountAddress) => {
	return await client.readContract({
		abi: AugurConstantProductRouter.abi,
		functionName: 'getShareTokenWrappers',
		address: getAugurConstantProductMarketRouterAddress(),
		args: [marketAddress]
	})
}

export const mintLiquidity = async (client: WriteClient, marketAddress: AccountAddress, sharesToBuy: EthereumQuantity, tickLower: number, tickUpper: number, amountNoMax: EthereumQuantity, amountYesMax: EthereumQuantity, deadline: EthereumQuantity) => {
	return await client.writeContract({
		chain: mainnet,
		abi: AugurConstantProductRouter.abi,
		functionName: 'mintLiquidity',
		address: getAugurConstantProductMarketRouterAddress(),
		args: [marketAddress, sharesToBuy, tickLower, tickUpper, amountNoMax, amountYesMax, deadline]
	})
}

export const increaseLiquidity = async (client: WriteClient, marketAddress: AccountAddress, tokenId: EthereumQuantity, sharesToBuy: EthereumQuantity, amountNoMax: EthereumQuantity, amountYesMax: EthereumQuantity, deadline: EthereumQuantity) => {
	return await client.writeContract({
		chain: mainnet,
		abi: AugurConstantProductRouter.abi,
		functionName: 'increaseLiquidity',
		address: getAugurConstantProductMarketRouterAddress(),
		args: [marketAddress, tokenId, sharesToBuy, amountNoMax, amountYesMax, deadline]
	})
}

export const decreaseLiquidity = async (client: WriteClient, marketAddress: AccountAddress, positionTokenId: EthereumQuantity, lpToSell: EthereumQuantity, amountNoMin: EthereumQuantity, amountYesMin: EthereumQuantity, deadline: EthereumQuantity) => {
	return await client.writeContract({
		chain: mainnet,
		abi: AugurConstantProductRouter.abi,
		functionName: 'decreaseLiquidity',
		address: getAugurConstantProductMarketRouterAddress(),
		args: [marketAddress, positionTokenId, lpToSell, amountNoMin, amountYesMin, deadline]
	})
}

export const burnLiquidity = async (client: WriteClient, marketAddress: AccountAddress, positionTokenId: EthereumQuantity, amountNoMin: EthereumQuantity, amountYesMin: EthereumQuantity, deadline: EthereumQuantity) => {
	return await client.writeContract({
		chain: mainnet,
		abi: AugurConstantProductRouter.abi,
		functionName: 'burnLiquidity',
		address: getAugurConstantProductMarketRouterAddress(),
		args: [marketAddress, positionTokenId, amountNoMin, amountYesMin, deadline]
	})
}

export const enterPosition = async (client: WriteClient, marketAddress: AccountAddress, amountInDai: EthereumQuantity, buyYes: boolean, minSharesOut: EthereumQuantity, deadline: EthereumQuantity) => {
	return await client.writeContract({
		chain: mainnet,
		abi: AugurConstantProductRouter.abi,
		functionName: 'enterPosition',
		address: getAugurConstantProductMarketRouterAddress(),
		args: [marketAddress, amountInDai, buyYes, minSharesOut, deadline]
	})
}

export const exitPosition = async (client: WriteClient, marketAddress: AccountAddress, daiToBuy: EthereumQuantity, maxSharesIn: EthereumQuantity, deadline: EthereumQuantity) => {
	return await client.writeContract({
		chain: mainnet,
		abi: AugurConstantProductRouter.abi,
		functionName: 'exitPosition',
		address: getAugurConstantProductMarketRouterAddress(),
		args: [marketAddress, daiToBuy, maxSharesIn, deadline]
	})
}

export const swapExactIn = async (client: WriteClient, marketAddress: AccountAddress, inputShares: EthereumQuantity, inputYes: boolean, minSharesOut: EthereumQuantity, deadline: EthereumQuantity) => {
	return await client.writeContract({
		chain: mainnet,
		abi: AugurConstantProductRouter.abi,
		functionName: 'swapExactIn',
		address: getAugurConstantProductMarketRouterAddress(),
		args: [marketAddress, inputYes, inputShares, minSharesOut, deadline]
	})
}

export const swapExactOut = async (client: WriteClient, marketAddress: AccountAddress, outputShares: EthereumQuantity, inputYes: boolean, maxSharesIn: EthereumQuantity, deadline: EthereumQuantity) => {
	return await client.writeContract({
		chain: mainnet,
		abi: AugurConstantProductRouter.abi,
		functionName: 'swapExactOut',
		address: getAugurConstantProductMarketRouterAddress(),
		args: [marketAddress, inputYes, outputShares, maxSharesIn, deadline]
	})
}

export const expectedSharesAfterSwap = async (client: ReadClient, marketAddress: AccountAddress, swapYes: boolean, exactAmount: EthereumQuantity) => {
	const abi = [{
		'inputs': [
			{
				'internalType': 'address',
				'name': 'augurMarketAddress',
				'type': 'address'
			},
			{
				'internalType': 'uint128',
				'name': 'exactAmount',
				'type': 'uint128'
			},
			{
				'internalType': 'bool',
				'name': 'swapYes',
				'type': 'bool'
			}
		],
		'stateMutability': 'nonpayable',
		'type': 'function',
		'name': 'quoteExactInputSingle',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '',
				'type': 'uint256'
			},
			{
				'internalType': 'uint256',
				'name': '',
				'type': 'uint256'
			}
		]
	}] as const

	const results = await client.readContract({
		abi: abi,
		functionName: 'quoteExactInputSingle',
		address: getAugurConstantProductMarketRouterAddress(),
		args: [marketAddress, exactAmount, swapYes]
	})
	return results[0]
}

export const expectedSharesNeededForSwap = async (client: ReadClient, marketAddress: AccountAddress, swapYes: boolean, exactAmount: EthereumQuantity) => {
	const abi = [{
		'inputs': [
			{
				'internalType': 'address',
				'name': 'augurMarketAddress',
				'type': 'address'
			},
			{
				'internalType': 'uint128',
				'name': 'exactAmount',
				'type': 'uint128'
			},
			{
				'internalType': 'bool',
				'name': 'swapYes',
				'type': 'bool'
			}
		],
		'stateMutability': 'nonpayable',
		'type': 'function',
		'name': 'quoteExactOutputSingle',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '',
				'type': 'uint256'
			},
			{
				'internalType': 'uint256',
				'name': '',
				'type': 'uint256'
			}
		]
	}] as const
	try {
		const results = await client.readContract({
			abi,
			functionName: 'quoteExactOutputSingle',
			address: getAugurConstantProductMarketRouterAddress(),
			args: [marketAddress, exactAmount, swapYes]
		})
		return { success: true, result: results[0] } as const
	} catch(e: unknown) {
		console.error(e)
		return { success: false } as const
	}
}

export const setErc1155ApprovalForAll = async (client: WriteClient, tokenAddress: AccountAddress, operatorAddress: AccountAddress, approved: boolean) => {
	return await client.writeContract({
		chain: mainnet,
		abi: ERC1155_ABI,
		functionName: 'setApprovalForAll',
		address: tokenAddress,
		args: [operatorAddress, approved]
	})
}

export const isErc1155ApprovedForAll = async (client: ReadClient, tokenAddress: AccountAddress, account: AccountAddress, operatorAddress: AccountAddress) => {
	return await client.readContract({
		abi: ERC1155_ABI,
		functionName: 'isApprovedForAll',
		address: tokenAddress,
		args: [account, operatorAddress]
	})
}

export const getTickSpacing = async (client: ReadClient) => {
	return await client.readContract({
		abi: AugurConstantProductRouter.abi,
		functionName: 'tickSpacing',
		address: getAugurConstantProductMarketRouterAddress(),
		args: []
	})
}

export const tickToPrice = (tick: number) => Math.pow(1.0001, tick)
export const priceToTick = (price: number, tickSpacing: number) => {
	if (price < 0) throw new Error('Price was negative')
	return Math.round(Math.min(Math.max(-887272, Math.round(Math.log(price) / Math.log(1.0001))), 887272) / tickSpacing) * tickSpacing
}
export const roundToClosestPrice = (price: number, tickSpacing: number) => tickToPrice(priceToTick(price, tickSpacing))

export const getUserLpTokenIdsForMarket = async (client: ReadClient, marketAddress: AccountAddress, user: AccountAddress) => {
	return await client.readContract({
		abi: AugurConstantProductRouter.abi,
		functionName: 'getUserLpTokenIdsForMarket',
		address: getAugurConstantProductMarketRouterAddress(),
		args: [marketAddress, user]
	})
}

export const getPoolAndPositionInfo = async (client: ReadClient, tokenId: EthereumQuantity) => {
	return await client.readContract({
		abi: IPositionManager.abi,
		functionName: 'getPoolAndPositionInfo',
		address: UNIV4_POSITION_MANAGER,
		args: [tokenId]
	})
}

export const getPositionInfo = async (client: ReadClient, tokenId: EthereumQuantity) => {
	return await client.readContract({
		abi: IPositionManager.abi,
		functionName: 'positionInfo',
		address: UNIV4_POSITION_MANAGER,
		args: [tokenId]
	})
}

export const getUserLpTokenIdsAndBalancesForMarket = async (client: ReadClient, marketAddress: AccountAddress, user: AccountAddress) => {
	const tokenIds = await getUserLpTokenIdsForMarket(client, marketAddress, user)
	return await Promise.all(
		tokenIds.map(async (tokenId) => ({
			tokenId,
			liquidityBalance: await getPoolLiquidityBalance(client, tokenId),
			positionInfo: parsePositionInfo(await getPositionInfo(client, tokenId))
		}))
	)
}
