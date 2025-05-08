import 'viem/window'
import { getContractAddress, numberToBytes, encodeAbiParameters, keccak256 } from 'viem'
import { mainnet } from 'viem/chains'
import { promises as fs } from 'fs'
import { createWriteClient, ReadClient, WriteClient } from './viem.js'
import { AUGUR_ADDRESS, AUGUR_UNIVERSE_ADDRESS, HOOK_IMPLEMENTATION_CODE, NULL_ADDRESS, PERMIT2, PROXY_DEPLOYER_ADDRESS, QUINTILLION, TEST_ADDRESSES, UNIV4_POSITION_MANAGER, VITALIK, YEAR_2030 } from './constants.js'
import { addressString } from './bigint.js'
import { Abi, Address, parseAbiItem } from 'viem'
import { ABIS } from '../../../abi/abis.js'
import * as funtypes from 'funtypes'
import { MockWindowEthereum } from '../MockWindowEthereum.js'
import { augurConstantProductMarketContractArtifact as vendoredACPMArtifact } from '../../../abi/VendoredAugurConstantProductMarket.js'
import { HOOK_SALT } from '../../../hookSalt.js'
import * as path from 'path'

let curHookSalt = HOOK_SALT

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
		'contracts/AugurConstantProductMarketRouter.sol': funtypes.ReadonlyObject({
			AugurConstantProductRouter: ContractDefinition
		}),
		'contracts/ShareTokenWrapperFactory.sol': funtypes.ReadonlyObject({
			ShareTokenWrapperFactory: ContractDefinition
		}),
		'contracts/uniswap/interfaces/IPositionManager.sol': funtypes.ReadonlyObject({
			IPositionManager: ContractDefinition
		}),
		'contracts/uniswap/interfaces/IV4Quoter.sol': funtypes.ReadonlyObject({
			IV4Quoter: ContractDefinition
		}),
		'contracts/uniswap/interfaces/IUniversalRouter.sol': funtypes.ReadonlyObject({
			IUniversalRouter: ContractDefinition
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

export function getShareTokenWrapperFactoryAddress() {
	const bytecode: `0x${ string }` = `0x${ augurConstantProductMarketContractArtifact.contracts['contracts/ShareTokenWrapperFactory.sol'].ShareTokenWrapperFactory.evm.bytecode.object }`
	return getContractAddress({ bytecode, from: addressString(PROXY_DEPLOYER_ADDRESS), opcode: 'CREATE2', salt: numberToBytes(0n) })
}

export const checkHookSalt = async () => {
	const routerAddress = getAugurConstantProductMarketRouterAddress(curHookSalt)
	if (routerAddress.endsWith(HOOK_IMPLEMENTATION_CODE)) return
	console.log(`Searching for salt`)
	let found = false
	let salt = 0n
	while (!found) {
		const addressAttempt = getAugurConstantProductMarketRouterAddress(salt)
		if (addressAttempt.endsWith(HOOK_IMPLEMENTATION_CODE)) {
			console.log(`!!! Salt found: ${salt}`)
			found = true
			curHookSalt = salt
			await fs.writeFile(path.join(process.cwd(), 'ts', 'hookSalt.ts'), `export const HOOK_SALT = ${salt}n`)
		}
		salt++;
	}
}

export function getAugurConstantProductMarketRouterAddress(salt: bigint = curHookSalt) {
	const bytecode: `0x${ string }` = `0x${ augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.evm.bytecode.object }`
	return getContractAddress({ bytecode, from: addressString(PROXY_DEPLOYER_ADDRESS), opcode: 'CREATE2', salt: numberToBytes(salt) })
}

export const deployShareTokenWrapperFactoryTransaction = () => {
	const bytecode: `0x${ string }` = `0x${0n.toString(16).padStart(64, '0')}${ augurConstantProductMarketContractArtifact.contracts['contracts/ShareTokenWrapperFactory.sol'].ShareTokenWrapperFactory.evm.bytecode.object }`
	return { to: addressString(PROXY_DEPLOYER_ADDRESS), data: bytecode } as const
}

export const deployAugurConstantProductMarketRouterTransaction = () => {
	const bytecode: `0x${ string }` = `0x${curHookSalt.toString(16).padStart(64, '0')}${ augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.evm.bytecode.object }`
	return { to: addressString(PROXY_DEPLOYER_ADDRESS), data: bytecode } as const
}

export const ensureShareTokenWrapperFactoryDeployed = async (client: WriteClient) => {
	const hash = await client.sendTransaction(deployShareTokenWrapperFactoryTransaction())
	await client.waitForTransactionReceipt({ hash })
}

export const ensureAugurConstantProductMarketRouterDeployed = async (client: WriteClient) => {
	const shareTokenWrapperFactoryAddress = await getShareTokenWrapperFactoryAddress()
	await checkHookSalt();
	const acpmRouterAddress = await getAugurConstantProductMarketRouterAddress()
	await ensureShareTokenWrapperFactoryDeployed(client)
	const hash = await client.sendTransaction(deployAugurConstantProductMarketRouterTransaction())

	await client.waitForTransactionReceipt({ hash })

	const routerAbi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	await client.writeContract({
		chain: mainnet,
		abi: routerAbi as Abi,
		functionName: 'initialize',
		address: acpmRouterAddress,
		args: [shareTokenWrapperFactoryAddress]
	})

	const factoryAbi = augurConstantProductMarketContractArtifact.contracts['contracts/ShareTokenWrapperFactory.sol'].ShareTokenWrapperFactory.abi
	await client.writeContract({
		chain: mainnet,
		abi: factoryAbi as Abi,
		functionName: 'initialize',
		address: shareTokenWrapperFactoryAddress,
		args: [acpmRouterAddress]
	})
}

export const deployAugurConstantProductMarket = async (client: WriteClient, duplicationTest:boolean = false, newMarket:boolean = false) => {
	if (!duplicationTest) await ensureAugurConstantProductMarketRouterDeployed(client)
	const acpmRouterAddress = await getAugurConstantProductMarketRouterAddress()
    const marketAddress = (!duplicationTest || newMarket) ? await deployAugurMarket(client) : augurMarketAddress
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	await client.writeContract({
		chain: mainnet,
		abi: abi as Abi,
		functionName: 'createACPM',
		address: acpmRouterAddress,
		args: [marketAddress]
	})
	return marketAddress
}

export const getExpectedLiquidity = async (client: ReadClient, tickLower: number, tickUpper: number, amountNo: bigint, amountYes: bigint) => {
	const acpmRouterAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = vendoredACPMArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.readContract({
		abi,
		functionName: 'getExpectedLiquidity',
		address: acpmRouterAddress,
		args: [augurMarketAddress, tickLower, tickUpper, amountNo, amountYes]
	})
}

export const getNumMarkets = async (client: ReadClient) => {
	const acpmRouterAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = vendoredACPMArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.readContract({
		abi,
		functionName: 'getNumMarkets',
		address: acpmRouterAddress,
		args: []
	})
}

export const getMarketIsValid = async (client: ReadClient, market: Address) => {
	const acpmRouterAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = vendoredACPMArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	const poolkey = await client.readContract({
		abi,
		functionName: 'marketIds',
		address: acpmRouterAddress,
		args: [market]
	})
	return poolkey[0] != addressString(0n)
}

export const getMarkets = async (client: ReadClient, startIndex: bigint, pageSize: bigint) => {
	const acpmRouterAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = vendoredACPMArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.readContract({
		abi,
		functionName: 'getMarkets',
		address: acpmRouterAddress,
		args: [startIndex, pageSize]
	})
}

export const getLpTokens = async (client: WriteClient) => {
	const acpmRouterAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = vendoredACPMArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.readContract({
		abi,
		functionName: 'getUserLpTokenIdsForMarket',
		address: acpmRouterAddress,
		args: [augurMarketAddress, client.account.address]
	})
}

export const getShareBalances = async (client: WriteClient, owner?: Address) => {
	const acpmRouterAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = vendoredACPMArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.readContract({
		abi,
		functionName: 'getShareBalances',
		address: acpmRouterAddress,
		args: [augurMarketAddress, owner || client.account.address]
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


export const getPoolKey = async (client: ReadClient) => {
	const address = getAugurConstantProductMarketRouterAddress()
	const abi = vendoredACPMArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.readContract({
		abi,
		functionName: 'marketIds',
		address,
		args: [augurMarketAddress]
	})
}

export const getNextPositionManagerToken = async (client: ReadClient) => {
	const abi = vendoredACPMArtifact.contracts['contracts/uniswap/interfaces/IPositionManager.sol'].IPositionManager.abi
	return await client.readContract({
		abi,
		functionName: 'nextTokenId',
		address: addressString(UNIV4_POSITION_MANAGER),
		args: []
	})
}

export const getPoolLiquidityBalance = async (client: WriteClient, tokenId: bigint) => {
	const abi = vendoredACPMArtifact.contracts['contracts/uniswap/interfaces/IPositionManager.sol'].IPositionManager.abi
	return await client.readContract({
		abi,
		functionName: 'getPositionLiquidity',
		address: addressString(UNIV4_POSITION_MANAGER),
		args: [tokenId]
	})
}

export const getLastPositionInfo = async (client: ReadClient) => {
	const abi = vendoredACPMArtifact.contracts['contracts/uniswap/interfaces/IPositionManager.sol'].IPositionManager.abi
	const nextTokenId = await client.readContract({
		abi,
		functionName: 'nextTokenId',
		address: addressString(UNIV4_POSITION_MANAGER),
		args: []
	})
	return await client.readContract({
		abi,
		functionName: 'getPositionLiquidity',
		address: addressString(UNIV4_POSITION_MANAGER),
		args: [nextTokenId - 1n]
	})
}

export const getOwnerOfPositionManagerToken = async (client: ReadClient, tokenId: bigint) => {
	const abi = vendoredACPMArtifact.contracts['contracts/uniswap/interfaces/IPositionManager.sol'].IPositionManager.abi
	return await client.readContract({
		abi,
		functionName: 'ownerOf',
		address: addressString(UNIV4_POSITION_MANAGER),
		args: [tokenId]
	})
}

export const buyShares = async (client: WriteClient, sharesToBuy: bigint) => {
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.writeContract({
		chain: mainnet,
		abi: abi as Abi,
		functionName: 'buyShares',
		address: routerAddress,
		args: [augurMarketAddress, sharesToBuy]
	})
}

export const getShareWrappers = async (client: ReadClient) => {
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.readContract({
		abi: abi as Abi,
		functionName: 'getShareTokenWrappers',
		address: routerAddress,
		args: [augurMarketAddress]
	}) as [Address, Address]
}

export const mintLiquidity = async (client: WriteClient, sharesToBuy: bigint, tickLower: number, tickUpper: number, amountNoMax: bigint, amountYesMax: bigint, deadline: bigint) => {
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.writeContract({
		chain: mainnet,
		abi: abi as Abi,
		functionName: 'mintLiquidity',
		address: routerAddress,
		args: [augurMarketAddress, sharesToBuy, tickLower, tickUpper, amountNoMax, amountYesMax, deadline]
	})
}

export const increaseLiquidity = async (client: WriteClient, tokenId: bigint, sharesToBuy: bigint, amountNoMax: bigint, amountYesMax: bigint, deadline: bigint) => {
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.writeContract({
		chain: mainnet,
		abi: abi as Abi,
		functionName: 'increaseLiquidity',
		address: routerAddress,
		args: [augurMarketAddress, tokenId, sharesToBuy, amountNoMax, amountYesMax, deadline]
	})
}

export const permit2Approve = async (client: WriteClient, token: Address, spender: Address) => {
	const amount = 1000000000000000000000000000000000n
	return await client.writeContract({
		chain: mainnet,
		abi: ABIS.mainnet.permit2,
		functionName: 'approve',
		address: addressString(PERMIT2),
		args: [token, spender, amount, bigIntToNumber(YEAR_2030)]
	})
}

export const decreaseLiquidity = async (client: WriteClient, positionTokenId: bigint, lpToSell: bigint, amountNoMin: bigint, amountYesMin: bigint, deadline: bigint) => {
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.writeContract({
		chain: mainnet,
		abi: abi as Abi,
		functionName: 'decreaseLiquidity',
		address: routerAddress,
		args: [augurMarketAddress, positionTokenId, lpToSell, amountNoMin, amountYesMin, deadline]
	})
}

export const decreaseLiquidityCall = async (client: WriteClient, positionTokenId: bigint, lpToSell: bigint, amountNoMin: bigint, amountYesMin: bigint, deadline: bigint) => {
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.readContract({
		abi: abi as Abi,
		functionName: 'decreaseLiquidity',
		address: routerAddress,
		args: [augurMarketAddress, positionTokenId, lpToSell, amountNoMin, amountYesMin, deadline]
	}) as [bigint, bigint, bigint]
}

export const burnLiquidity = async (client: WriteClient, positionTokenId: bigint, amountNoMin: bigint, amountYesMin: bigint, deadline: bigint) => {
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.writeContract({
		chain: mainnet,
		abi: abi as Abi,
		functionName: 'burnLiquidity',
		address: routerAddress,
		args: [augurMarketAddress, positionTokenId, amountNoMin, amountYesMin, deadline]
	})
}

export const burnLiquidityCall = async (client: WriteClient, positionTokenId: bigint, amountNoMin: bigint, amountYesMin: bigint, deadline: bigint) => {
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.readContract({
		abi: abi as Abi,
		functionName: 'burnLiquidity',
		address: routerAddress,
		args: [augurMarketAddress, positionTokenId, amountNoMin, amountYesMin, deadline]
	}) as [bigint, bigint, bigint]
}

export const unwrapLpToken = async (client: WriteClient, positionTokenId: bigint) => {
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.writeContract({
		chain: mainnet,
		abi: abi as Abi,
		functionName: 'unwrapLpToken',
		address: routerAddress,
		args: [augurMarketAddress, positionTokenId]
	})
}

export const enterPosition = async (client: WriteClient, amountInDai: bigint, buyYes: boolean, minSharesOut: bigint = 0n, deadline = YEAR_2030) => {
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.writeContract({
		chain: mainnet,
		abi: abi as Abi,
		functionName: 'enterPosition',
		address: routerAddress,
		args: [augurMarketAddress, amountInDai, buyYes, minSharesOut, deadline]
	})
}

export const approveToken = async (client: WriteClient, tokenAddress: Address, spenderAddress: Address) => {
	const amount = 1000000000000000000000000000000000n
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
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.writeContract({
		chain: mainnet,
		abi: abi as Abi,
		functionName: 'exitPosition',
		address: routerAddress,
		args: [augurMarketAddress, daiToBuy, maxSharesIn, deadline]
	})
}

export const swapExactIn = async (client: WriteClient, inputShares: bigint, inputYes: boolean, minSharesOut: bigint = 0n, deadline = YEAR_2030) => {
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.writeContract({
		chain: mainnet,
		abi: abi as Abi,
		functionName: 'swapExactIn',
		address: routerAddress,
		args: [augurMarketAddress, inputYes, inputShares, minSharesOut, deadline]
	})
}

export const swapExactOut = async (client: WriteClient, outputShares: bigint, inputYes: boolean, maxSharesIn: bigint = QUINTILLION, deadline = YEAR_2030) => {
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.writeContract({
		chain: mainnet,
		abi: abi as Abi,
		functionName: 'swapExactOut',
		address: routerAddress,
		args: [augurMarketAddress, inputYes, outputShares, maxSharesIn, deadline]
	})
}

export const expectedSharesAfterSwap = async (client: ReadClient, swapYes: boolean, exactAmount: bigint) => {
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	const results = await client.readContract({
		abi: abi as Abi,
		functionName: 'quoteExactInputSingle',
		address: routerAddress,
		args: [augurMarketAddress, exactAmount, swapYes]
	}) as [bigint, bigint]
	return results[0]
}

export const expectedSharesNeededForSwap = async (client: ReadClient, swapYes: boolean, exactAmount: bigint) => {
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	const results = await client.readContract({
		abi: abi as Abi,
		functionName: 'quoteExactOutputSingle',
		address: routerAddress,
		args: [augurMarketAddress, exactAmount, swapYes]
	}) as [bigint, bigint]
	return results[0]
}

export const getExactShareEnterEstimate = async (client: ReadClient, exactShares: bigint, buyYes: boolean, maxDaiIn: bigint) => {
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.readContract({
		abi: abi as Abi,
		functionName: 'getExactShareEnterEstimate',
		address: routerAddress,
		args: [augurMarketAddress, exactShares, buyYes, maxDaiIn]
	}) as [bigint, bigint]
}

export const getShareSplit = async (client: ReadClient, sharesToSwap: bigint, buyYes: boolean) => {
	const routerAddress = await getAugurConstantProductMarketRouterAddress()
	const abi = augurConstantProductMarketContractArtifact.contracts['contracts/AugurConstantProductMarketRouter.sol'].AugurConstantProductRouter.abi
	return await client.readContract({
		abi: abi as Abi,
		functionName: 'getShareSplit',
		address: routerAddress,
		args: [augurMarketAddress, sharesToSwap, buyYes]
	}) as [bigint, bigint]
}
