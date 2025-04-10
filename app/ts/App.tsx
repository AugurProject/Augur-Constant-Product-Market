import { Signal, useComputed, useSignal, useSignalEffect } from '@preact/signals'
import { useEffect, useRef } from 'preact/hooks'
import { AccountAddress, EthereumAddress, EthereumQuantity } from './types/types.js'
import { OptionalSignal, useOptionalSignal } from './utils/OptionalSignal.js'
import { createReadClient, createWriteClient, getAccounts, getChainId, ReadClient, requestAccounts, WriteClient } from './utils/ethereumWallet.js'
import { DeployContract } from './ConstantProductUI/components/DeployContract.js'
import { CreateYesNoMarket } from './CreateMarketUI/components/CreateMarket.js'
import { ensureError } from './utils/errorHandling.js'
import { Reporting } from './ReportingUI/components/Reporting.js'
import { ClaimFunds } from './ClaimFundsUI/ClaimFunds.js'
import { isAugurConstantProductMarketDeployed } from './utils/contractDeployment.js'
import { JSX } from 'preact'
import { DAI_TOKEN_ADDRESS, DEFAULT_UNIVERSE } from './utils/constants.js'
import { addressString, bigintToDecimalString, formatUnixTimestampISO, getEthereumBalance } from './utils/ethereumUtils.js'
import { getUniverseName } from './utils/augurUtils.js'
import { getReputationTokenForUniverse, getUniverseForkingInformation, isKnownUniverse } from './utils/augurContractUtils.js'
import { SomeTimeAgo } from './ReportingUI/components/SomeTimeAgo.js'
import { Migration } from './MigrationUI/components/Migration.js'
import { getErc20TokenBalance } from './utils/erc20.js'
import { ParticipationTokens } from './ParticipationTokensUI/ParticipationTokensUI.js'
import { bigintSecondsToDate, humanReadableDateDelta } from './utils/utils.js'

interface UniverseComponentProps {
	universe: OptionalSignal<AccountAddress>
}

const UniverseComponent = ({ universe }: UniverseComponentProps) => {
	if (universe.deepValue === undefined) return <p> No universe selected</p>
	const universeName = getUniverseName(universe.deepValue)
	return <p style = 'color: gray; justify-self: left;'>Universe:<b>{ ` ${ universeName }` }</b></p>
}

interface UniverseForkingNoticeProps {
	universeForkingInformation: OptionalSignal<Awaited<ReturnType<typeof getUniverseForkingInformation>>>
}

const UniverseForkingNotice = ({ universeForkingInformation }: UniverseForkingNoticeProps) => {
	if (universeForkingInformation.deepValue !== undefined && universeForkingInformation.deepValue.isForking) {
		const forkingEndTime = bigintSecondsToDate(universeForkingInformation.deepValue.forkEndTime)
		return <div style = 'padding: 10px; background-color: red;'>
			<p>
				<SomeTimeAgo priorTimestamp = { forkingEndTime } countBackwards = { true } diffToText = {
					(time: number) => {
						if (universeForkingInformation.deepValue === undefined) return <></>
						if (universeForkingInformation.deepValue.isForking === false) return <></>
						if (time <= 0) return <>
							The universe <b>{ getUniverseName(universeForkingInformation.deepValue.universe) } </b> has forked off.
							Disagreements on the outcome of the market { universeForkingInformation.deepValue.forkingMarket } has caused the fork.
							Please use some other universe.
						</>
						return <>
							The Universe <b>{ getUniverseName(universeForkingInformation.deepValue.universe) }</b> is forking.
							The fork ends in { humanReadableDateDelta(time) } ({ formatUnixTimestampISO(universeForkingInformation.deepValue.forkEndTime) }).
							Disagreements on the outcome of the market { universeForkingInformation.deepValue.forkingMarket } has caused the fork.
						</>
					}
				}/>
			</p>
		</div>
	}
	return <></>
}

interface WalletComponentProps {
	maybeReadClient: OptionalSignal<ReadClient>
	maybeWriteClient: OptionalSignal<WriteClient>
	loadingAccount: Signal<boolean>
}

const WalletComponent = ({ maybeReadClient, maybeWriteClient, loadingAccount }: WalletComponentProps) => {
	if (loadingAccount.value) return <></>
	const accountAddress = useComputed(() => maybeReadClient.deepValue?.account?.address)
	const connect = async () => {
		updateWalletSignals(maybeReadClient, maybeWriteClient, await requestAccounts())
	}
	return accountAddress.value !== undefined ? (
		<p style = 'color: gray; justify-self: right;'>{ `Connected with ${ accountAddress.value }` }</p>
	) : (
		<button class = 'button is-primary' style = 'justify-self: right;' onClick = { connect }>
			{ `Connect wallet` }
		</button>
	)
}

interface WalletBalancesProps {
	daiBalance: OptionalSignal<EthereumQuantity>
	repBalance: OptionalSignal<EthereumQuantity>
	ethBalance: OptionalSignal<EthereumQuantity>
}

const WalletBalances = ({ daiBalance, repBalance, ethBalance }: WalletBalancesProps) => {
	const balances = []
	if (ethBalance.deepValue !== undefined) balances.push(`${ bigintToDecimalString(ethBalance.deepValue, 18n, 2) } ETH`)
	if (repBalance.deepValue !== undefined) balances.push(`${ bigintToDecimalString(repBalance.deepValue, 18n, 2) } REP`)
	if (daiBalance.deepValue !== undefined) balances.push(`${ bigintToDecimalString(daiBalance.deepValue, 18n, 2) } DAI`)
	return <div>{ balances.join(' - ') }</div>
}

interface TabsProps {
	tabs: readonly { title: string, path: string, component: JSX.Element }[]
	activeTab: Signal<number>
}

const Tabs = ({ tabs, activeTab }: TabsProps) => {
	const handleTabClick = (index: number) => {
		if (tabs[index] === undefined) throw new Error(`invalid Tab index: ${ index }`)
		activeTab.value = index
		window.location.hash = `#/${ tabs[index].path }`
	}

	return (
		<div>
			<div style = { { display: 'flex', gap: '10px', borderBottom: '2px solid #ccc' } }>
				{ tabs.map((tab, index) => (
					<button
						key = { index }
						onClick = { () => handleTabClick(index) }
						style = { {
							padding: '10px',
							border: 'none',
							background: activeTab.value === index ? '#ddd' : 'transparent',
							cursor: 'pointer',
							borderBottom: activeTab.value === index ? '2px solid black' : 'none'
						}}
					>
						{ tab.title }
					</button>
				)) }
			</div>
			<div style = { { padding: '10px' } }>
				{ tabs[activeTab.value]?.component ?? null }
			</div>
		</div>
	)
}

const updateWalletSignals = (maybeReadClient: OptionalSignal<ReadClient>, maybeWriteClient: OptionalSignal<WriteClient>, account: AccountAddress | undefined) => {
	maybeReadClient.deepValue = account === undefined ? createReadClient(undefined) : createWriteClient(account)
	maybeWriteClient.deepValue = account === undefined ? undefined : createWriteClient(account)
}

export function App() {
	const errorString = useOptionalSignal<string>(undefined)
	const loadingAccount = useSignal<boolean>(false)
	const isWindowEthereum = useSignal<boolean>(true)
	const areContractsDeployed = useSignal<boolean | undefined>(undefined)
	const maybeReadClient = useOptionalSignal<ReadClient>(undefined)
	const maybeWriteClient = useOptionalSignal<WriteClient>(undefined)
	const chainId = useSignal<number | undefined>(undefined)
	const inputTimeoutRef = useRef<number | null>(null)
	const universe = useOptionalSignal<AccountAddress>(undefined)
	const universeForkingInformation = useOptionalSignal<Awaited<ReturnType<typeof getUniverseForkingInformation>>>(undefined)
	const reputationTokenAddress = useOptionalSignal<AccountAddress>(undefined)
	const activeTab = useSignal(0)

	const ethBalance = useOptionalSignal<EthereumQuantity>(undefined)
	const repBalance = useOptionalSignal<EthereumQuantity>(undefined)
	const daiBalance = useOptionalSignal<EthereumQuantity>(undefined)

	const pathSignal = useSignal<string>('')

	const tabs = [
		{ title: 'Trading', path: 'trading', component: <DeployContract maybeWriteClient = { maybeWriteClient } areContractsDeployed = { areContractsDeployed }/> },
		{ title: 'Market Creation', path: 'market-creation', component: <CreateYesNoMarket maybeReadClient = { maybeReadClient } maybeWriteClient = { maybeWriteClient } universe = { universe } reputationTokenAddress = { reputationTokenAddress }/> },
		{ title: 'Reporting', path: 'reporting', component: <Reporting maybeReadClient = { maybeReadClient } maybeWriteClient = { maybeWriteClient } universe = { universe } reputationTokenAddress = { reputationTokenAddress }/> },
		{ title: 'Claim Funds', path: 'claim-funds', component: <ClaimFunds maybeReadClient = { maybeReadClient } maybeWriteClient = { maybeWriteClient }/> },
		{ title: 'Migration', path: 'migration', component: <Migration maybeReadClient = { maybeReadClient } maybeWriteClient = { maybeWriteClient } reputationTokenAddress = { reputationTokenAddress } universe = { universe } universeForkingInformation = { universeForkingInformation } pathSignal = { pathSignal }/> },
		{ title: 'Participation Tokens', path: 'participation-tokens', component: <ParticipationTokens maybeReadClient = { maybeReadClient } maybeWriteClient = { maybeWriteClient } universe = { universe }/> }
	] as const

	useSignalEffect(() => {
		window.history.pushState({}, '', pathSignal.value)
		const hash = pathSignal.value.replace('#/', '')
		const [pathPart, params] = hash.split('?')
		const tabIndex = tabs.findIndex(tab => tab.path === pathPart)
		if (tabIndex !== -1) {
			activeTab.value = tabIndex
		} else {
			//TODO: rather show 404 than keep orignal
		}
		const searchParams = new URLSearchParams(params)
		const universeParam = searchParams.get('universe')
		const parsed = EthereumAddress.safeParse(universeParam)

		if (universeParam && parsed.success) {
			universe.deepValue = addressString(parsed.value)
		} else {
			//TODO: rather show 404
			universe.deepValue = addressString(BigInt(DEFAULT_UNIVERSE))
		}
	})

	useEffect(() => { pathSignal.value = window.location.hash }, [])

	const setError = (error: unknown) => {
		if (error === undefined) {
			errorString.value = undefined
			return
		}
		const ensured = ensureError(error)
		errorString.deepValue = ensured.message
	}

	const updateChainId = async () => {
		const readClient = maybeReadClient.deepPeek()
		if (readClient === undefined) return
		chainId.value = await getChainId(readClient)
	}

	const setUniverseIfValid = async () => {
		const readClient = maybeReadClient.deepPeek()
		if (readClient === undefined) return
		if (universe.deepValue === undefined) return
		if (!(await isKnownUniverse(readClient, universe.deepValue))) throw new Error(`${ universe.deepValue } is not an universe recognized by Augur.`)
	}

	useEffect(() => {
		if (window.ethereum === undefined) {
			isWindowEthereum.value = false
			return
		}
		isWindowEthereum.value = true
		window.ethereum.on('accountsChanged', function (accounts) {
			updateWalletSignals(maybeReadClient, maybeWriteClient, accounts[0])
		})
		window.ethereum.on('chainChanged', async () => { updateChainId() })
		const fetchAccount = async () => {
			try {
				loadingAccount.value = true
				const fetchedAccount = await getAccounts()
				updateWalletSignals(maybeReadClient, maybeWriteClient, fetchedAccount)
				updateChainId()
			} catch(e) {
				setError(e)
			} finally {
				loadingAccount.value = false
				areContractsDeployed.value = maybeReadClient.deepValue === undefined ? undefined : await isAugurConstantProductMarketDeployed(maybeReadClient.deepValue)
			}
			setUniverseIfValid()
		}
		fetchAccount()
		return () => {
			if (inputTimeoutRef.current !== null) {
				clearTimeout(inputTimeoutRef.current)
			}
		}
	}, [])

	useSignalEffect(() => {
		const universeInfo = async (readClient: ReadClient | undefined, universe: AccountAddress | undefined) => {
			if (readClient === undefined) return
			if (universe === undefined) return
			universeForkingInformation.deepValue = await getUniverseForkingInformation(readClient, universe)
			reputationTokenAddress.deepValue = await getReputationTokenForUniverse(readClient, universe)

			if (readClient.account?.address === undefined) return
			repBalance.deepValue = await getErc20TokenBalance(readClient, reputationTokenAddress.deepValue, readClient.account.address)
			daiBalance.deepValue = await getErc20TokenBalance(readClient, DAI_TOKEN_ADDRESS, readClient.account.address)
			ethBalance.deepValue = await getEthereumBalance(readClient, readClient.account.address)
		}
		universeInfo(maybeReadClient.deepValue, universe.deepValue)
	})

	if (universe.deepValue === undefined) return <main><p> loading... </p></main>

	return <main style = 'overflow: auto;'>
		<div class = 'app'>
			<div style = 'display: flex; justify-content: space-between;'>
				<UniverseComponent universe = { universe}/>
				<WalletComponent loadingAccount = { loadingAccount } maybeReadClient = { maybeReadClient } maybeWriteClient = { maybeWriteClient }/>
			</div>
			<div style = 'display: flex; justify-content: right;'>
				<WalletBalances ethBalance = { ethBalance } daiBalance = { daiBalance } repBalance = { repBalance }/>
			</div>
			<UniverseForkingNotice universeForkingInformation = { universeForkingInformation }/>
			<div style = 'display: block'>
				<div class = 'augur-constant-product-market'>
					<img src = 'favicon.svg' alt = 'Icon' style ='width: 60px;'/> Augur Constant Product Market
				</div>
				<p class = 'sub-title'>Swap Augur tokens!</p>
			</div>
		</div>
		<Tabs tabs = { tabs } activeTab = { activeTab }/>
		<div class = 'text-white/50 text-center'>
			<div class = 'mt-8'>
				Augur Constant Product Market by&nbsp;
				<a class = 'text-white hover:underline' href='https://dark.florist'>
					Dark Florist
				</a>
			</div>
			<div class = 'inline-grid'>
				<a class = 'text-white hover:underline' href='https://discord.gg/BeFnJA5Kjb'>
					Discord
				</a>
				<a class = 'text-white hover:underline' href='https://twitter.com/DarkFlorist'>
					Twitter
				</a>
				<a class = 'text-white hover:underline' href='https://github.com/DarkFlorist'>
					Github
				</a>
			</div>
		</div>
	</main>
}
