import 'viem/window'
import { getContractAddress, numberToBytes, encodeAbiParameters, keccak256 } from 'viem'
import { mainnet } from 'viem/chains'
import { promises as fs } from 'fs'
import { createWriteClient, ReadClient, WriteClient } from './viem.js'
import { AUGUR_ADDRESS, AUGUR_UNIVERSE_ADDRESS, NULL_ADDRESS, PROXY_DEPLOYER_ADDRESS, QUINTILLION, TEST_ADDRESSES, VITALIK, YEAR_2030 } from './constants.js'
import { addressString } from './bigint.js'
import { Abi, Address, parseAbiItem } from 'viem'
import { ABIS } from '../../../abi/abis.js'
import * as funtypes from 'funtypes'
import { MockWindowEthereum } from '../MockWindowEthereum.js'
import { augurConstantProductMarketContractArtifact as vendoredACPMArtifact } from '../../../abi/VendoredAugurConstantProductMarket.js'

const ContractDefinition = funtypes.ReadonlyObject({
	abi: funtypes.Unknown,
	evm: funtypes.ReadonlyObject({
		bytecode: funtypes.ReadonlyObject({
			object: funtypes.String
		}),
		deployedBytecode: funtypes.ReadonlyObject({
			object: funtypes.String
		})
	})
})

type ContractArtifact = funtypes.Static<typeof ContractArtifact>
const ContractArtifact = funtypes.ReadonlyObject({
	contracts: funtypes.ReadonlyObject({
		'contracts/AugurConstantProductMarket.sol': funtypes.ReadonlyObject({
			AugurConstantProduct: ContractDefinition
		}),
		'contracts/AugurConstantProductMarketFactory.sol': funtypes.ReadonlyObject({
			AugurConstantProductMarketFactory: ContractDefinition
		}),
		'contracts/AugurConstantProductMarketRouter.sol': funtypes.ReadonlyObject({
			AugurConstantProductRouter: ContractDefinition
		}),
	}),
})

const contractLocation = './artifacts/AugurConstantProductMarket.json'
export const augurConstantProductMarketContractArtifact = ContractArtifact.parse(JSON.parse(await fs.readFile(contractLocation, 'utf8')))

let augurMarketAddress:Address = "0x0"

export function getMarketAddress() {
	return augurMarketAddress
}

export async function sleep(milliseconds: number) {
	await new Promise(resolve => setTimeout(resolve, milliseconds))
}

export function jsonStringify(value: unknown, space?: string | number | undefined): string {
    return JSON.stringify(value, (_, value) => {
		if (typeof value === 'bigint') return `0x${value.toString(16)}n`
		if (value instanceof Uint8Array) return `b'${Array.from(value).map(x => x.toString(16).padStart(2, '0')).join('')}'`
		// cast works around https://github.com/uhyo/better-typescript-lib/issues/36
		return value as JSONValueF<unknown>
    }, space)
}

export function jsonParse(text: string): unknown {
	return JSON.parse(text, (_key: string, value: unknown) => {
		if (typeof value !== 'string') return value
		if (/^0x[a-fA-F0-9]+n$/.test(value)) return BigInt(value.slice(0, -1))
		const bytesMatch = /^b'(:<hex>[a-fA-F0-9])+'$/.exec(value)
		if (bytesMatch && 'groups' in bytesMatch && bytesMatch.groups && 'hex' in bytesMatch.groups && bytesMatch.groups['hex'].length % 2 === 0) return hexToBytes(`0x${bytesMatch.groups['hex']}`)
		return value
	})
}

export function ensureError(caught: unknown) {
	return (caught instanceof Error) ? caught
		: typeof caught === 'string' ? new Error(caught)
		: typeof caught === 'object' && caught !== null && 'message' in caught && typeof caught.message === 'string' ? new Error(caught.message)
		: new Error(`Unknown error occurred.\n${jsonStringify(caught)}`)
}

function hexToBytes(value: string) {
	const result = new Uint8Array((value.length - 2) / 2)
	for (let i = 0; i < result.length; ++i) {
		result[i] = Number.parseInt(value.slice(i * 2 + 2, i * 2 + 4), 16)
	}
	return result
}

export function dataString(data: Uint8Array | null) {
	if (data === null) return ''
	return Array.from(data).map(x => x.toString(16).padStart(2, '0')).join('')
}

export function dataStringWith0xStart(data: Uint8Array | null): `0x${ string }` {
	if (data === null) return '0x'
	return `0x${ dataString(data) }`
}

export function decodeEthereumNameServiceString(ens: string): string {
	const parts = ens.split('.')
	const encodedData: string[] = []
	encodedData.push('0x')

	function stringToHex(str: string): string {
		return Array.from(str).map((char) => char.charCodeAt(0).toString(16).padStart(2, '0')).join('')
	}
	parts.forEach((part) => {
		const encodedPart = stringToHex(part)
		const byteCount = (encodedPart.length / 2).toString(16).padStart(2, '0')
		encodedData.push(byteCount + encodedPart)
	})

	encodedData.push('00')
	return encodedData.join('')
}

export function assertNever(value: never): never {
	throw new Error(`Unhandled discriminated union member: ${JSON.stringify(value)}`)
}

export function isSameAddress(address1: `0x${ string }` | undefined, address2: `0x${ string }` | undefined) {
	if (address1 === undefined && address2 === undefined) return true
	if (address1 === undefined || address2 === undefined) return false
	return address1.toLowerCase() === address2.toLowerCase()
}

export const splitEnsStringToSubdomainPath = (input: string): string[] => {
	const parts = input.split('.')
	const result: string[] = []

	for (let i = 0; i < parts.length; i++) {
		const joined = parts.slice(i).join('.')
		result.push(joined)
	}
	result.pop() // eth element
	return result.reverse()
}

export const splitDomainToSubDomainAndParent = (domain: string): [string, string] => {
	const index = domain.indexOf('.')
	if (index === -1) throw new Error('not proper domain')
	return [domain.slice(0, index), domain.slice(index + 1)]
}

export function bigIntToNumber(value: bigint): number {
	if (value <= Number.MAX_SAFE_INTEGER && value >= Number.MIN_SAFE_INTEGER) {
		return Number(value)
	}
	throw new Error(`Value: "${ value }" is out of bounds to be a Number.`)
}

export const requestAccounts = async () => {
	if (window.ethereum === undefined) throw new Error('no window.ethereum injected')
	const reply = await window.ethereum.request({ method: 'eth_requestAccounts', params: undefined })
	return reply[0]
}

export const getAccounts = async () => {
	if (window.ethereum === undefined) throw new Error('no window.ethereum injected')
	const reply = await window.ethereum.request({ method: 'eth_accounts', params: undefined })
	return reply[0]
}

export const mintETH = async (mockWindowEthereum: MockWindowEthereum, mintAmounts: { address: Address, amount: bigint }[]) => {
	const stateOverrides = mintAmounts.reduce((acc, current) => {
		acc[current.address] = { balance: current.amount }
		return acc
	}, {} as { [key: string]: {[key: string]: bigint }} )
	await mockWindowEthereum.addStateOverrides(stateOverrides)
}

export const mintCash = async (mockWindowEthereum: MockWindowEthereum, mintAmounts: { address: Address, amount: bigint }[]) => {
	const cashAddress = await getCashAddress(createWriteClient(mockWindowEthereum, VITALIK, 0))
	const overrides = mintAmounts.map((mintAmount) => {
		const encodedKeySlotHash = keccak256(encodeAbiParameters([{ type: 'address' }, { type: 'uint256' }], [mintAmount.address, 2n]))
		return { key: encodedKeySlotHash, value: mintAmount.amount }
	})
	const stateSets = overrides.reduce((acc, current) => {
		acc[current.key] = current.value
		return acc
	}, {} as { [key: string]: bigint } )
	await mockWindowEthereum.addStateOverrides({ [cashAddress]: { stateDiff: stateSets }})
}

export const mintRep = async (mockWindowEthereum: MockWindowEthereum, mintAmounts: { address: Address, amount: bigint }[]) => {
	const repAddress = await getRepAddress(createWriteClient(mockWindowEthereum, VITALIK, 0))
	const overrides = mintAmounts.map((mintAmount) => {
		const encodedKeySlotHash = keccak256(encodeAbiParameters([{ type: 'address' }, { type: 'uint256' }], [mintAmount.address, 1n]))
		return { key: encodedKeySlotHash, value: mintAmount.amount }
	})
	const stateSets = overrides.reduce((acc, current) => {
		acc[current.key] = current.value
		return acc
	}, {} as { [key: string]: bigint } )
	await mockWindowEthereum.addStateOverrides({ [repAddress]: { stateDiff: stateSets }})
}

export const getCashAddress = async (client: ReadClient) => {
	return await client.readContract({
		abi: ABIS.mainnet.universe,
		functionName: 'cash',
		address: addressString(AUGUR_UNIVERSE_ADDRESS),
		args: []
	})
}

export const getRepAddress = async (client: ReadClient, universe: bigint = AUGUR_UNIVERSE_ADDRESS) => {
	return await client.readContract({
		abi: ABIS.mainnet.universe,
		functionName: 'getReputationToken',
		address: addressString(universe),
		args: []
	})
}

export const setupTestAccounts = async (mockWindowEthereum: MockWindowEthereum) => {
	const accountValues = TEST_ADDRESSES.map((address) => {
		return { address: addressString(address), amount: 1000000n * 10n**18n}
	})
	await mintETH(mockWindowEthereum, accountValues)
	await mintCash(mockWindowEthereum, accountValues)
	await mintRep(mockWindowEthereum, accountValues)
}

export const deployAugurMarket = async (client: WriteClient, storeMarketAddress: boolean = true): Promise<Address> => {
	await approveCash(client, addressString(AUGUR_ADDRESS))
	const endTime = BigInt(Math.floor(Date.now() / 1000) + 100000)
	const blockNumber = await client.getBlockNumber()
	await client.writeContract({
		abi: ABIS.mainnet.universe,
		functionName: 'createYesNoMarket',
		address: addressString(AUGUR_UNIVERSE_ADDRESS),
		args: [endTime, 0n, addressString(NULL_ADDRESS), 0n, client.account.address, "{}"]
	})
	const logs = await client.getLogs({
		address: addressString(AUGUR_ADDRESS),
		event: parseAbiItem("event MarketCreated(address indexed universe, uint256 endTime, string extraInfo, address market, address indexed marketCreator, address designatedReporter, uint256 feePerCashInAttoCash, int256[] prices, uint8 marketType, uint256 numTicks, bytes32[] outcomes, uint256 noShowBond, uint256 timestamp)"),
		fromBlock: blockNumber
	})
	if (storeMarketAddress) augurMarketAddress = logs[0].args.market!
	return logs[0].args.market!
}

export async function ensureProxyDeployerDeployed(client: WriteClient): Promise<void> {
	const deployerBytecode = await client.getCode({ address: addressString(PROXY_DEPLOYER_ADDRESS)})
	if (deployerBytecode === '0x60003681823780368234f58015156014578182fd5b80825250506014600cf3') return
	const ethSendHash = await client.sendTransaction({ to: '0x4c8d290a1b368ac4728d83a9e8321fc3af2b39b1', amount: 10000000000000000n })
	await client.waitForTransactionReceipt({ hash: ethSendHash })
	const deployHash = await client.sendRawTransaction({ serializedTransaction: '0xf87e8085174876e800830186a08080ad601f80600e600039806000f350fe60003681823780368234f58015156014578182fd5b80825250506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222' })
	await client.waitForTransactionReceipt({ hash: deployHash })
}

export function getAugurConstantProductMarketFactoryAddress() {
	const bytecode: `0x${ string }` = `0x${ augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketFactory.sol'].AugurConstantProductMarketFactory.evm.bytecode.object }`
	return getContractAddress({ bytecode, from: addressString(PROXY_DEPLOYER_ADDRESS), opcode: 'CREATE2', salt: numberToBytes(0) })
}

export function getAugurConstantProductMarketRouterAddress() {
	const bytecode: `0x${ string }` = `0x${ augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.evm.bytecode.object }`
	return getContractAddress({ bytecode, from: addressString(PROXY_DEPLOYER_ADDRESS), opcode: 'CREATE2', salt: numberToBytes(0) })
}

export const isAugurConstantProductMarketFactoryDeployed = async (client: ReadClient) => {
	const expectedDeployedBytecode: `0x${ string }` = `0x${ augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketFactory.sol'].AugurConstantProductMarketFactory.evm.deployedBytecode.object }`
	const address = getAugurConstantProductMarketFactoryAddress()
	const deployedBytecode = await client.getCode({ address })
	return deployedBytecode === expectedDeployedBytecode
}

export const deployAugurConstantProductMarketFactoryTransaction = () => {
	const bytecode: `0x${ string }` = `0x${ augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketFactory.sol'].AugurConstantProductMarketFactory.evm.bytecode.object }`
	return { to: addressString(PROXY_DEPLOYER_ADDRESS), data: bytecode } as const
}

export const deployAugurConstantProductMarketRouterTransaction = () => {
	const bytecode: `0x${ string }` = `0x${ augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.evm.bytecode.object }`
	return { to: addressString(PROXY_DEPLOYER_ADDRESS), data: bytecode } as const
}

export const ensureAugurConstantProductMarketFactoryDeployed = async (client: WriteClient) => {
	await ensureProxyDeployerDeployed(client)
	const hash = await client.sendTransaction(deployAugurConstantProductMarketFactoryTransaction())
	await client.waitForTransactionReceipt({ hash })
}

export const ensureAugurConstantProductMarketRouterDeployed = async (client: WriteClient) => {
	await ensureProxyDeployerDeployed(client)
	const hash = await client.sendTransaction(deployAugurConstantProductMarketRouterTransaction())
	await client.waitForTransactionReceipt({ hash })
}

export const getAugurConstantProductMarketAddress = async (client: ReadClient, augurMarket?: Address) => {
	const acpmFactoryAddress = await getAugurConstantProductMarketFactoryAddress()
	augurMarket = augurMarket || augurMarketAddress
	const abi = vendoredACPMArtifact.contracts['contracts/AugurConstantProductMarketFactory.sol'].AugurConstantProductMarketFactory.abi
	return await client.readContract({
		abi,
		functionName: 'getACPMAddress',
		address: acpmFactoryAddress,
		args: [augurMarket]
	})
}

export const isAugurConstantProductMarketDeployed = async (client: ReadClient) => {
	const address = await getAugurConstantProductMarketAddress(client)
	const deployedBytecode = await client.getCode({ address })
	return deployedBytecode !== '0x0'
}

export const deployAugurConstantProductMarketContract = async (client: WriteClient, duplicationTest:boolean = false, newMarket:boolean = false) => {
    if (!duplicationTest) await ensureAugurConstantProductMarketFactoryDeployed(client)
	if (!duplicationTest) await ensureAugurConstantProductMarketRouterDeployed(client)
	const acpmFactoryAddress = await getAugurConstantProductMarketFactoryAddress()
    const marketAddress = (!duplicationTest || newMarket) ? await deployAugurMarket(client) : augurMarketAddress
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketFactory.sol'].AugurConstantProductMarketFactory.abi
	await client.writeContract({
		chain: mainnet,
		abi: abi as Abi,
		functionName: 'createACPM',
		address: acpmFactoryAddress,
		args: [marketAddress]
	})
	return marketAddress
}

export const getNumMarkets = async (client: ReadClient) => {
	const acpmFactoryAddress = await getAugurConstantProductMarketFactoryAddress()
	const abi = vendoredACPMArtifact.contracts['contracts/AugurConstantProductMarketFactory.sol'].AugurConstantProductMarketFactory.abi
	return await client.readContract({
		abi,
		functionName: 'getNumMarkets',
		address: acpmFactoryAddress,
		args: []
	})
}

export const getMarketIsValid = async (client: ReadClient, market: Address) => {
	const acpmFactoryAddress = await getAugurConstantProductMarketFactoryAddress()
	const abi = vendoredACPMArtifact.contracts['contracts/AugurConstantProductMarketFactory.sol'].AugurConstantProductMarketFactory.abi
	return await client.readContract({
		abi,
		functionName: 'isValidMarket',
		address: acpmFactoryAddress,
		args: [market]
	})
}

export const getMarkets = async (client: ReadClient, startIndex: bigint, pageSize: bigint) => {
	const acpmFactoryAddress = await getAugurConstantProductMarketFactoryAddress()
	const abi = vendoredACPMArtifact.contracts['contracts/AugurConstantProductMarketFactory.sol'].AugurConstantProductMarketFactory.abi
	return await client.readContract({
		abi,
		functionName: 'getMarkets',
		address: acpmFactoryAddress,
		args: [startIndex, pageSize]
	})
}

export const getACPMName = async (client: ReadClient) => {
	const address = await getAugurConstantProductMarketAddress(client)
	const abi = vendoredACPMArtifact.contracts['contracts/AugurConstantProductMarket.sol'].AugurConstantProduct.abi
	return await client.readContract({
		abi,
		functionName: 'name',
		address: address,
		args: []
	})
}

export const getACPMSymbol = async (client: ReadClient) => {
	const address = await getAugurConstantProductMarketAddress(client)
	const abi = vendoredACPMArtifact.contracts['contracts/AugurConstantProductMarket.sol'].AugurConstantProduct.abi
	return await client.readContract({
		abi,
		functionName: 'symbol',
		address: address,
		args: []
	})
}

export const getReportingFee = async (client: WriteClient) => {
	return await client.readContract({
		abi: ABIS.mainnet.universe,
		functionName: 'getReportingFeeDivisor',
		address: addressString(AUGUR_UNIVERSE_ADDRESS),
		args: []
	})
}

export const approveCash = async (client: WriteClient, target?: Address) => {
	const cashAddress = await getCashAddress(client)
	target = target || await getAugurConstantProductMarketRouterAddress()
	const amount = 1000000000000000000000000000000n
	return await client.writeContract({
		chain: mainnet,
		abi: ABIS.mainnet.erc20,
		functionName: 'approve',
		address: cashAddress,
		args: [target, amount]
	})
}

export const getCashBalance = async (client: WriteClient, address?: Address) => {
	const cashAddress = await getCashAddress(client)
	return await client.readContract({
		abi: ABIS.mainnet.erc20,
		functionName: 'balanceOf',
		address: cashAddress,
		args: [address ? address: client.account.address]
	})
}

export const getCashAllowance = async (client: WriteClient) => {
	const cashAddress = await getCashAddress(client)
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	return await client.readContract({
		abi: ABIS.mainnet.erc20,
		functionName: 'allowance',
		address: cashAddress,
		args: [client.account.address, routerAddress]
	})
}

export const getPoolSupply = async (client: WriteClient) => {
	const acpmAddress = await getAugurConstantProductMarketAddress(client)
	const abi = vendoredACPMArtifact.contracts['contracts/AugurConstantProductMarket.sol'].AugurConstantProduct.abi
	return await client.readContract({
		abi,
		functionName: 'totalSupply',
		address: acpmAddress,
		args: []
	})
}

export const getPoolLiquidityBalance = async (client: WriteClient) => {
	const acpmAddress = await getAugurConstantProductMarketAddress(client)
	const abi = vendoredACPMArtifact.contracts['contracts/AugurConstantProductMarket.sol'].AugurConstantProduct.abi
	return await client.readContract({
		abi,
		functionName: 'balanceOf',
		address: acpmAddress,
		args: [client.account.address]
	})
}

export const getShareToken = async (client: ReadClient) => {
	const acpmAddress = await getAugurConstantProductMarketAddress(client)
	const abi = vendoredACPMArtifact.contracts['contracts/AugurConstantProductMarket.sol'].AugurConstantProduct.abi
	return await client.readContract({
		abi,
		functionName: 'shareToken',
		address: acpmAddress,
		args: []
	})
}

export const getShareBalances = async (client: ReadClient, account: Address) => {
	const acpmAddress = await getAugurConstantProductMarketAddress(client)
	const abi = vendoredACPMArtifact.contracts['contracts/AugurConstantProductMarket.sol'].AugurConstantProduct.abi
	return await client.readContract({
		abi,
		functionName: 'shareBalances',
		address: acpmAddress,
		args: [account]
	})
}

export const getNoYesShareBalances = async (client: ReadClient, account: Address) => {
	const acpmAddress = await getAugurConstantProductMarketAddress(client)
	const abi = vendoredACPMArtifact.contracts['contracts/AugurConstantProductMarket.sol'].AugurConstantProduct.abi
	return await client.readContract({
		abi,
		functionName: 'noYesShareBalances',
		address: acpmAddress,
		args: [account]
	})
}

export const getFee = async (client: ReadClient) => {
	const acpmAddress = await getAugurConstantProductMarketAddress(client)
	const abi = vendoredACPMArtifact.contracts['contracts/AugurConstantProductMarket.sol'].AugurConstantProduct.abi
	return await client.readContract({
		abi,
		functionName: 'fee',
		address: acpmAddress,
		args: []
	})
}

export const getCloseOutSwapAmount = async (client: ReadClient, shareBalance: bigint, swapYes: boolean) => {
	const acpmAddress = await getAugurConstantProductMarketAddress(client)
	const abi = vendoredACPMArtifact.contracts['contracts/AugurConstantProductMarket.sol'].AugurConstantProduct.abi
	return await client.readContract({
		abi: abi as Abi,
		functionName: 'getCloseOutSwapAmount',
		address: acpmAddress,
		args: [shareBalance, swapYes]
	}) as bigint
}

export const closeOut = async (client: WriteClient, deadline = YEAR_2030) => {
	const acpmAddress = await getAugurConstantProductMarketAddress(client)
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.writeContract({
		chain: mainnet,
		abi: abi as Abi,
		functionName: 'closeOut',
		address: routerAddress,
		args: [acpmAddress, deadline]
	})
}

export const addLiquidity = async (client: WriteClient, sharesToBuy: bigint) => {
	const acpmAddress = await getAugurConstantProductMarketAddress(client)
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.writeContract({
		chain: mainnet,
		abi: abi as Abi,
		functionName: 'addLiquidity',
		address: routerAddress,
		args: [acpmAddress, sharesToBuy]
	})
}

export const removeLiquidity = async (client: WriteClient, poolTokensToSell: bigint) => {
	const acpmAddress = await getAugurConstantProductMarketAddress(client)
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.writeContract({
		chain: mainnet,
		abi: abi as Abi,
		functionName: 'removeLiquidity',
		address: routerAddress,
		args: [acpmAddress, poolTokensToSell]
	})
}

export const enterPosition = async (client: WriteClient, amountInDai: bigint, buyYes: boolean, minSharesOut: bigint = 0n, deadline = YEAR_2030) => {
	const acpmAddress = await getAugurConstantProductMarketAddress(client)
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.writeContract({
		chain: mainnet,
		abi: abi as Abi,
		functionName: 'enterPosition',
		address: routerAddress,
		args: [acpmAddress, amountInDai, buyYes, minSharesOut, deadline]
	})
}

export const approveToken = async (client: WriteClient, tokenAddress: Address, spenderAddress: Address) => {
	const amount = 1000000000000000000000000000000n
	return await client.writeContract({
		chain: mainnet,
		abi: ABIS.mainnet.erc20,
		functionName: 'approve',
		address: tokenAddress,
		args: [spenderAddress, amount]
	})
}

export const setERC1155Approval = async (client: WriteClient, tokenAddress: Address, operatorAddress: Address, approved: boolean) => {
	return await client.writeContract({
		chain: mainnet,
		abi: ABIS.mainnet.erc1155,
		functionName: 'setApprovalForAll',
		address: tokenAddress,
		args: [operatorAddress, approved]
	})
}

export const exitPosition = async (client: WriteClient, daiToBuy: bigint, maxSharesIn: bigint = QUINTILLION, deadline = YEAR_2030) => {
	const acpmAddress = await getAugurConstantProductMarketAddress(client)
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.writeContract({
		chain: mainnet,
		abi: abi as Abi,
		functionName: 'exitPosition',
		address: routerAddress,
		args: [acpmAddress, daiToBuy, maxSharesIn, deadline]
	})
}

export const swap = async (client: WriteClient, inputShares: bigint, inputYes: boolean, minSharesOut: bigint = 0n, deadline = YEAR_2030) => {
	const acpmAddress = await getAugurConstantProductMarketAddress(client)
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.writeContract({
		chain: mainnet,
		abi: abi as Abi,
		functionName: 'swapExactSharesForShares',
		address: routerAddress,
		args: [acpmAddress, inputShares, inputYes, minSharesOut, deadline]
	})
}

export const swapForExact = async (client: WriteClient, outputShares: bigint, inputYes: boolean, maxSharesIn: bigint = QUINTILLION, deadline = YEAR_2030) => {
	const acpmAddress = await getAugurConstantProductMarketAddress(client)
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.writeContract({
		chain: mainnet,
		abi: abi as Abi,
		functionName: 'swapSharesForExactShares',
		address: routerAddress,
		args: [acpmAddress, outputShares, inputYes, maxSharesIn, deadline]
	})
}


export const expectedSharesAfterSwap = async (client: ReadClient, sharesFromUser: bigint, inputYes: boolean) => {
	const acpmAddress = await getAugurConstantProductMarketAddress(client)
	const shareBalances = await getShareBalances(client, acpmAddress)
	const fee = await getFee(client)
	const reserveOut = inputYes ? shareBalances[1] : shareBalances[2]
	const reserveIn = inputYes ? shareBalances[2] : shareBalances[1]
	const amountInWithFee = sharesFromUser * (1000n - fee)
	return (amountInWithFee * reserveOut) / (reserveIn * 1000n + amountInWithFee)
}

export const expectedSharesNeededForSwap = async (client: ReadClient, sharesToUser: bigint, inputYes: boolean) => {
	const acpmAddress = await getAugurConstantProductMarketAddress(client)
	const shareBalances = await getShareBalances(client, acpmAddress)
	const fee = await getFee(client)
	const reserveOut = inputYes ? shareBalances[1] : shareBalances[2]
	const reserveIn = inputYes ? shareBalances[2] : shareBalances[1]
	return (reserveIn * sharesToUser * 1000n) / ((reserveOut - sharesToUser) * (1000n - fee));
}
