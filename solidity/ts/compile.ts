import { promises as fs } from 'fs'
import * as path from 'path'
import solc from 'solc'
import * as funtypes from 'funtypes'

const CompileError = funtypes.ReadonlyObject({
	severity: funtypes.String,
	formattedMessage: funtypes.String
})

type CompileResult = funtypes.Static<typeof CompileResult>
const CompileResult = funtypes.ReadonlyObject({
	errors: funtypes.Array(CompileError)
})

async function exists(path: string) {
	try {
		await fs.stat(path)
		return true
	} catch {
		return false
	}
}

const contractList = [
	'AugurConstantProductMarket.sol',
	'AugurConstantProductMarketRouter.sol',
	'IAugurConstantProduct.sol',
	'Context.sol',
	'draft-IERC6093.sol',
	'ERC20.sol',
	'IERC20.sol',
	'IERC20Metadata.sol',
	'IOwnable.sol',
	'ITyped.sol',
	'IERC1155.sol',
	'IShareToken.sol',
	'IMarket.sol',
	'IAugur.sol',
	'Constants.sol',
	'AugurConstantProductMarketFactory.sol',
	'ContractExists.sol',
	'AddressToString.sol'
]

const sources = await contractList.reduce(async (acc, curr) => {
	const value = { content: await fs.readFile(`contracts/${curr}`, 'utf8') }
	acc.then(obj => obj[curr] = value);
	return acc
}, Promise.resolve(<{ [key: string]: { content: string } }>{}))

const compileAugurConstantProductMarket = async () => {
	const input = {
		language: 'Solidity',
		sources,
		settings: {
			viaIR: true,
			optimizer: {
				enabled: true,
				runs: 500,
				details: {
					inliner: true,
				}
			},
			outputSelection: {
				"*": {
					'*': [ 'evm.bytecode.object', 'evm.deployedBytecode.object', 'abi' ]
				}
			},
		},
	}
	var output = solc.compile(JSON.stringify(input))
	var result = CompileResult.parse(JSON.parse(output))
	let errors = (result!.errors || []).filter((x) => (x.severity === "error")).map((x) => x.formattedMessage);
	if (errors.length) {
        let error = new Error("compilation error");
        (<any>error).errors = errors
        throw error
    }
	const artifactsDir = path.join(process.cwd(), 'artifacts')
	if (!await exists(artifactsDir)) await fs.mkdir(artifactsDir, { recursive: false })
	await fs.writeFile(path.join(artifactsDir, 'AugurConstantProductMarket.json'), output)
}

compileAugurConstantProductMarket().catch(error => {
	console.error(error)
	debugger
	process.exit(1)
})
