import { AccountAddress } from '../types/types.js'
import { buyParticipationTokens, fetchHotLoadingCurrentDisputeWindowData } from '../utils/augurContractUtils.js'
import { bigintToDecimalString, formatUnixTimestampISO } from '../utils/ethereumUtils.js'
import { ReadClient, WriteClient } from '../utils/ethereumWallet.js'
import { OptionalSignal, useOptionalSignal } from '../utils/OptionalSignal.js'

type DisputeWindowData = {
	disputeWindow: `0x${ string }`
	startTime: bigint
	endTime: bigint
	purchased: bigint
	fees: bigint
}

interface DisputeWindowProps {
	disputeWindowData: OptionalSignal<DisputeWindowData>
}
export const DisputeWindow = ({ disputeWindowData }: DisputeWindowProps) => {
	if (disputeWindowData.deepValue === undefined) return <></>
	return <div class = 'panel'>
		<div style = 'display: grid'>
			<span><b>Dispute Window:</b>{ disputeWindowData.deepValue.disputeWindow }</span>
			<span><b>Start Time:</b>{ formatUnixTimestampISO(disputeWindowData.deepValue.startTime) }</span>
			<span><b>End Time:</b>{ formatUnixTimestampISO(disputeWindowData.deepValue.endTime) }</span>
			<span><b>Fees:</b>{ bigintToDecimalString(disputeWindowData.deepValue.fees, 18n, 2) } DAI</span>
			<span><b>Purchased:</b>{ disputeWindowData.deepValue.purchased } Participation Tokens</span>
		</div>
	</div>
}

interface ParticipationTokensProps {
	maybeReadClient: OptionalSignal<ReadClient>
	maybeWriteClient: OptionalSignal<WriteClient>
	universe: OptionalSignal<AccountAddress>
}

export const ParticipationTokens = ({ maybeReadClient, maybeWriteClient, universe }: ParticipationTokensProps) => {
	const disputeWindowData = useOptionalSignal<DisputeWindowData>(undefined)

	const update = async () => {
		const readClient = maybeReadClient.deepPeek()
		if (readClient === undefined) throw new Error('missing readClient')
		if (universe.deepValue === undefined) throw new Error('missing universe')
		disputeWindowData.deepValue = undefined
		disputeWindowData.deepValue = await fetchHotLoadingCurrentDisputeWindowData(readClient, universe.deepValue)
	}

	const buyParticipationTokensButton = async () => {
		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) throw new Error('missing writeClient')
		if (universe.deepValue === undefined) throw new Error('missing universe')
		await buyParticipationTokens(writeClient, universe.deepValue, 10n)
	}

	return <div class = 'subApplication'>
		<p style = 'margin: 0;'>Participation Tokens:</p>
		<div style = 'display: grid; width: 100%; gap: 10px;'>
			<button class = 'button is-primary' onClick = { update }>Update window</button>
			<DisputeWindow disputeWindowData = { disputeWindowData }/>
			<button class = 'button is-primary' onClick = { buyParticipationTokensButton }>Buy 10 Particiption Tokens</button>
		</div>
	</div>
}
