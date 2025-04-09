import { Signal, useSignal } from '@preact/signals'
import { AccountAddress } from '../types/types.js'
import { bigintToDecimalString } from '../utils/ethereumUtils.js'
import { OptionalSignal, useOptionalSignal } from '../utils/OptionalSignal.js'
import { getAvailableDisputes, getAvailableReports, getAvailableShareData, redeemStake } from '../utils/augurContractUtils.js'
import { deployAugurForkUtils, forkReportingParticipants, getAvailableDisputesFromForkedMarkets } from '../utils/augurForkUtilities.js'
import { ReadClient, WriteClient } from '../utils/ethereumWallet.js'

interface DisplayShareDataProps {
	availaleShareData: OptionalSignal<Awaited<ReturnType<typeof getAvailableShareData>>>
	selectedShares: Signal<Set<AccountAddress>>
}

const DisplayShareData = ({ availaleShareData, selectedShares }: DisplayShareDataProps) => {
	if (availaleShareData.deepValue === undefined) return <></>
	if (availaleShareData.deepValue.length === 0) {
		return <div class = 'panel'>
			<div style = 'display: grid'>
				<span><b>Claims for market shares:</b></span>
				<span>No claims on this account</span>
			</div>
		</div>
	}
	return <div class = 'panel'>
		<div style = 'display: grid'>
			<span><b>Claims for market shares:</b></span>
			{
				availaleShareData.deepValue.map((shareEntry) => <>
				<span key = { shareEntry.market }>
					<label>
						<input
							type = 'checkbox'
							name = 'selectedOutcome'
							checked = { selectedShares.value.has(shareEntry.market) }
							disabled = { shareEntry.payout === 0n }
							onChange = { () => {
								if (selectedShares.value.has(shareEntry.market)) selectedShares.value.delete(shareEntry.market)
								else selectedShares.value.add(shareEntry.market)
							} }
						/>
						<span><b>Market { shareEntry.market }</b>{ ': ' }{ shareEntry.payout > 0 ? `${ bigintToDecimalString(shareEntry.payout, 18n, 2) } DAI` : 'CLAIMED' }</span>
					</label>
				</span>
				</>)
			}
		</div>
	</div>
}

interface DisplayDisputesDataProps {
	availableDisputes: OptionalSignal<Awaited<ReturnType<typeof getAvailableDisputes>>>
	selectedDisputes: Signal<Set<AccountAddress>>
}

const DisplayDisputesData = ({ availableDisputes, selectedDisputes }: DisplayDisputesDataProps) => {
	if (availableDisputes.deepValue === undefined) return <></>
	if (availableDisputes.deepValue.length === 0) {
		return <div class = 'panel'>
			<div style = 'display: grid'>
				<span><b>Claims for participation tokens</b></span>
				<span>No claims on this account</span>
			</div>
		</div>
	}
	return <div class = 'panel'>
		<div style = 'display: grid'>
			<span><b>Claims for participation tokens</b></span>
			{
				availableDisputes.deepValue.map((disputeEntry) => <>
					<span key = { disputeEntry.bond }>
						<label>
							<input
								type = 'checkbox'
								name = 'selectedOutcome'
								checked = { selectedDisputes.value.has(disputeEntry.bond) }
								disabled = { disputeEntry.amount === 0n }
								onChange = { () => {
									if (selectedDisputes.value.has(disputeEntry.bond)) selectedDisputes.value.delete(disputeEntry.bond)
									else selectedDisputes.value.add(disputeEntry.bond)
								} }
							/>
							<span><b>Market { disputeEntry.market }{ ': ' }</b>
							{ ' -  ' }Bond { disputeEntry.bond }{ ': ' }{ disputeEntry.amount > 0 ? `${ bigintToDecimalString(disputeEntry.amount, 18n, 2) } REP` : 'CLAIMED' }</span>
						</label>
					</span>
				</>)
			}
		</div>
	</div>
}

interface ForkAndRedeemDisputeCrowdSourcersProps {
	availableClaimsFromForkingDisputeCrowdSourcers: OptionalSignal<Awaited<ReturnType<typeof getAvailableDisputesFromForkedMarkets>>>
	selectedForkedCrowdSourcers: Signal<Set<AccountAddress>>
}

const ForkAndRedeemDisputeCrowdSourcers = ({ availableClaimsFromForkingDisputeCrowdSourcers, selectedForkedCrowdSourcers }: ForkAndRedeemDisputeCrowdSourcersProps) => {
	if (availableClaimsFromForkingDisputeCrowdSourcers.deepValue === undefined) return <></>
	if (availableClaimsFromForkingDisputeCrowdSourcers.deepValue.length === 0) {
		return <div class = 'panel'>
			<div style = 'display: grid'>
				<span><b>Claims from forked markets</b></span>
				<span>No claims from forked markets</span>
			</div>
		</div>
	}
	return <div class = 'panel'>
		<div style = 'display: grid'>
			<span><b>Claims from forked markets</b></span>
			{
				availableClaimsFromForkingDisputeCrowdSourcers.deepValue.map((disputeEntry) => <>
					<span key = { disputeEntry.bond }>
						<label>
							<input
								type = 'checkbox'
								name = 'selectedOutcome'
								checked = { selectedForkedCrowdSourcers.value.has(disputeEntry.bond) }
								disabled = { disputeEntry.amount === 0n }
								onChange = { () => {
									if (selectedForkedCrowdSourcers.value.has(disputeEntry.bond)) selectedForkedCrowdSourcers.value.delete(disputeEntry.bond)
									else selectedForkedCrowdSourcers.value.add(disputeEntry.bond)
								} }
							/>
							<span><b>Market { disputeEntry.market }{ ': ' }</b>
							{ ' -  ' }Bond { disputeEntry.bond }{ ': ' }{ disputeEntry.amount > 0 ? `${ bigintToDecimalString(disputeEntry.amount, 18n, 2) } REP` : 'CLAIMED' }</span>
						</label>
					</span>
				</>)
			}
		</div>
	</div>
}

interface DisplayReportsDataProps {
	availableReports: OptionalSignal<Awaited<ReturnType<typeof getAvailableReports>>>
	selectedReports: Signal<Set<AccountAddress>>
}

const DisplayReportsData = ({ availableReports, selectedReports }: DisplayReportsDataProps) => {
	if (availableReports.deepValue === undefined) return <></>
	if (availableReports.deepValue.length === 0) {
		return <div class = 'panel'>
			<div style = 'display: grid'>
				<span><b>Claims for winning initial reporter or dispute crowdsourcer bonds</b></span>
				<span>No claims on this account</span>
			</div>
		</div>
	}
	return <div class = 'panel'>
		<div style = 'display: grid'>
			<span><b>Claims for winning initial reporter or dispute crowdsourcer bonds</b></span>
			{
				availableReports.deepValue.map((initialReport) => <>
					<span key = { initialReport.bond }>
						<label>
							<input
								type = 'radio'
								name = 'selectedOutcome'
								checked = { selectedReports.value.has(initialReport.bond) }
								disabled = { initialReport.amount === 0n }
								onChange = { () => {
									if (selectedReports.value.has(initialReport.bond)) selectedReports.value.delete(initialReport.bond)
									else selectedReports.value.add(initialReport.bond)
								} }
							/>
							<span><b>Market { initialReport.market }{ ': ' }</b>
							{ ' -  ' } Bond { initialReport.bond }{ ': ' }{ initialReport.amount > 0 ? `${ bigintToDecimalString(initialReport.amount, 18n, 2) } REP` : 'CLAIMED' }</span>
						</label>
					</span>
				</>)
			}
		</div>
	</div>
}

interface ClaimFundsProps {
	maybeReadClient: OptionalSignal<ReadClient>
	maybeWriteClient: OptionalSignal<WriteClient>
}

export const ClaimFunds = ({ maybeReadClient, maybeWriteClient }: ClaimFundsProps) => {
	const availaleShareData = useOptionalSignal<Awaited<ReturnType<typeof getAvailableShareData>>>(undefined)
	const availableDisputes = useOptionalSignal<Awaited<ReturnType<typeof getAvailableDisputes>>>(undefined)
	const availableReports = useOptionalSignal<Awaited<ReturnType<typeof getAvailableReports>>>(undefined)
	const availableClaimsFromForkingDisputeCrowdSourcers = useOptionalSignal<Awaited<ReturnType<typeof getAvailableDisputesFromForkedMarkets>>>(undefined)

	const selectedShares = useSignal<Set<AccountAddress>>(new Set([]))
	const selectedDisputes = useSignal<Set<AccountAddress>>(new Set([]))
	const selectedReports = useSignal<Set<AccountAddress>>(new Set([]))
	const selectedForkedCrowdSourcers = useSignal<Set<AccountAddress>>(new Set([]))

	const queryForData = async () => {
		availaleShareData.deepValue = undefined
		availableDisputes.deepValue = undefined
		availableReports.deepValue = undefined
		selectedShares.value = new Set([])
		selectedDisputes.value = new Set([])
		selectedReports.value = new Set([])
		const readClient = maybeReadClient.deepPeek()
		if (readClient === undefined) throw new Error('readClient missing')
		if (readClient.account?.address === undefined) throw new Error('account missing')
		availaleShareData.deepValue = await getAvailableShareData(readClient, readClient.account.address)
		availableDisputes.deepValue = await getAvailableDisputes(readClient, readClient.account.address)
		availableReports.deepValue = await getAvailableReports(readClient, readClient.account.address)
		availableClaimsFromForkingDisputeCrowdSourcers.deepValue = await getAvailableDisputesFromForkedMarkets(readClient, readClient.account.address)
	}

	const claim = async () => {
		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) throw new Error('writeClient missing')
		const reportingParticipants = Array.from(selectedReports.value) // Winning Initial Reporter or Dispute Crowdsourcer bonds the msg sender has stake in
		const disputeWindows = Array.from(selectedDisputes.value) // Dispute Windows (Participation Tokens) the msg sender has tokens for
		if (reportingParticipants.length === 0 && disputeWindows.length === 0) return
		return await redeemStake(writeClient, reportingParticipants, disputeWindows)
	}
	const deployForkUtils = async () => {
		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) throw new Error('writeClient missing')
		await deployAugurForkUtils(writeClient)
	}
	const claimWinningShares = async () => {
		throw new Error('TODO: not implemented claimin of winning shares')
	}
	const claimForkDisputes = async () => {
		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) throw new Error('account missing')
		const selected = Array.from(selectedForkedCrowdSourcers.value) // Winning Initial Reporter or Dispute Crowdsourcer bonds the msg sender has stake in
		if (selected.length === 0) return
		return await forkReportingParticipants(writeClient, selected)
	}

	return <div class = 'subApplication'>
		<p style = 'margin: 0;'>Claim Funds</p>
		<div style = 'display: grid; width: 100%; gap: 10px;'>
			<button class = 'button is-primary' onClick = { deployForkUtils }>Deploy fork utils</button>
			<button class = 'button is-primary' onClick = { queryForData }>Query For Claims</button>
			<DisplayShareData availaleShareData = { availaleShareData } selectedShares = { selectedShares }/>
			<button class = 'button is-primary' onClick = { claimWinningShares }>Claim Winning shares</button>
			<DisplayDisputesData availableDisputes = { availableDisputes } selectedDisputes = { selectedDisputes }/>
			<DisplayReportsData availableReports = { availableReports } selectedReports = { selectedReports }/>
			<button class = 'button is-primary' onClick = { claim }>Claim Participation tokens, winning initial reporter and dispute crowdsourcer bonds</button>
			<ForkAndRedeemDisputeCrowdSourcers availableClaimsFromForkingDisputeCrowdSourcers = { availableClaimsFromForkingDisputeCrowdSourcers } selectedForkedCrowdSourcers = { selectedForkedCrowdSourcers }/>
			<button class = 'button is-primary' onClick = { claimForkDisputes }>Claim fork disputes</button>
		</div>
	</div>
}
