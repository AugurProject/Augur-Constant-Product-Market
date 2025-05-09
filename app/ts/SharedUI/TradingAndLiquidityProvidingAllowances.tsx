import { useComputed, useSignal } from '@preact/signals'
import { WriteClient } from '../utils/ethereumWallet.js'
import { OptionalSignal, useOptionalSignal } from '../utils/OptionalSignal.js'
import { AUGUR_SHARE_TOKEN, DAI_TOKEN_ADDRESS } from '../utils/constants.js'
import { approveErc20Token, getAllowanceErc20Token } from '../utils/erc20.js'
import { setErc1155ApprovalForAll } from '../utils/augurConstantProductMarketUtils.js'
import { bigintToDecimalString, bigintToDecimalStringWithUnknown, bigintToDecimalStringWithUnknownAndPracticallyInfinite, decimalStringToBigint, isDecimalString } from '../utils/ethereumUtils.js'
import { Input } from './Input.js'
import { EthereumQuantity } from '../types/types.js'
import { Toggle } from './Toggle.js'
import { getAugurConstantProductMarketRouterAddress } from '../utils/augurDeployment.js'

interface TradingAndLiquidityProvidingAllowancesProps {
	maybeWriteClient: OptionalSignal<WriteClient>
	requiredDaiApproval: OptionalSignal<bigint>
	sharesApprovedToRouter: OptionalSignal<boolean>
	allowedDai: OptionalSignal<bigint>
}

export const TradingAndLiquidityProvidingAllowances = ({ maybeWriteClient, requiredDaiApproval, allowedDai, sharesApprovedToRouter }: TradingAndLiquidityProvidingAllowancesProps) => {
	const daiAllowanceToBeSet = useOptionalSignal<bigint>(undefined)
	const selectedRouterShareApproval = useSignal<'Approve' | 'Remove Approval'>('Approve')

	const cannotSetDaiAllowance = useComputed(() => {
		if (maybeWriteClient.deepValue === undefined) return true
		if (daiAllowanceToBeSet.deepValue === undefined || daiAllowanceToBeSet.deepValue <= 0n) return true
		return false
	})

	const cannotSetRouterShareApproval = useComputed(() => {
		if (maybeWriteClient.deepValue === undefined) return true
		if (sharesApprovedToRouter.deepValue === undefined) return true
		if (selectedRouterShareApproval.value === 'Approve' && sharesApprovedToRouter.deepValue === true) return true
		if (selectedRouterShareApproval.value === 'Remove Approval' && sharesApprovedToRouter.deepValue === false) return true
		return false
	})

	const approveDai = async () => {
		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) throw new Error('missing writeClient')
		if (daiAllowanceToBeSet.deepValue === undefined || daiAllowanceToBeSet.deepValue <= 0n) throw new Error('not valid allowance')
		await approveErc20Token(writeClient, DAI_TOKEN_ADDRESS, getAugurConstantProductMarketRouterAddress(), daiAllowanceToBeSet.deepValue)
		allowedDai.deepValue = await getAllowanceErc20Token(writeClient, DAI_TOKEN_ADDRESS, writeClient.account.address, getAugurConstantProductMarketRouterAddress())
	}

	const approveSharesForRouter = async () => {
		if (maybeWriteClient.deepValue === undefined) return
		const router = getAugurConstantProductMarketRouterAddress()
		await setErc1155ApprovalForAll(maybeWriteClient.deepValue, AUGUR_SHARE_TOKEN, router, selectedRouterShareApproval.value === 'Approve')
		sharesApprovedToRouter.deepValue = selectedRouterShareApproval.value === 'Approve'
	}

	function setMaxDaiAllowance() {
		daiAllowanceToBeSet.deepValue = 2n ** 256n - 1n
	}

	return <div class = 'form-grid'>
		<h3>Allowances</h3>
		<div style = { { display: 'grid', gap: '0.5em', gridTemplateColumns: 'auto auto auto' } }>
			<div style = { { alignContent: 'center' } }>
				Allowed DAI: { bigintToDecimalStringWithUnknownAndPracticallyInfinite(allowedDai.deepValue, 18n, 2) } DAI (required: { bigintToDecimalStringWithUnknown(requiredDaiApproval.deepValue, 18n, 2) } DAI)
			</div>
			<div style = { { display: 'flex', alignItems: 'baseline', gap: '0.5em' } }>
				<Input
					class = 'input reporting-panel-input'
					type = 'text'
					placeholder = 'REP to allow'
					style = { { maxWidth: '300px' } }
					value = { daiAllowanceToBeSet }
					sanitize = { (amount: string) => amount.trim() }
					tryParse = { (amount: string | undefined) => {
						if (amount === undefined) return { ok: false } as const
						if (!isDecimalString(amount.trim())) return { ok: false } as const
						const parsed = decimalStringToBigint(amount.trim(), 18n)
						return { ok: true, value: parsed } as const
					}}
					serialize = { (amount: EthereumQuantity | undefined) => {
						if (amount === undefined) return ''
						return bigintToDecimalString(amount, 18n, 18)
					}}
				/>
				<span class = 'unit'>DAI</span>
				<button class = 'button button-secondary button-small ' style = { { whiteSpace: 'nowrap' } } onClick = { setMaxDaiAllowance }>Max</button>
			</div>
			<button class = 'button button-secondary button-small' style = { { width: '100%', whiteSpace: 'nowrap' } } disabled = { cannotSetDaiAllowance } onClick = { approveDai }>
				Set DAI allowance
			</button>
			<div style = { { alignContent: 'center' } }>
				Shares Approved: { sharesApprovedToRouter.deepValue === true ? 'YES' : (sharesApprovedToRouter.deepValue === undefined ? '?' : 'NO') }
			</div>
			<div style = { { display: 'flex', alignItems: 'baseline', gap: '0.5em' } }>
				<Toggle options = { ['Approve', 'Remove Approval'] } selectedSignal = { selectedRouterShareApproval }/>
			</div>
			<button class = 'button button-secondary button-small' style = { { width: '100%', whiteSpace: 'nowrap' } } disabled = { cannotSetRouterShareApproval } onClick = { approveSharesForRouter }>
				Set Approval
			</button>
		</div>
	</div>
}
