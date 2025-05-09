import { useComputed, useSignal, useSignalEffect } from '@preact/signals'
import { createYesNoMarket, estimateGasCreateYesNoMarket, getMarketRepBondForNewMarket, getMaximumMarketEndDate, getValidityBond } from '../../utils/augurContractUtils.js'
import { OptionalSignal, useOptionalSignal } from '../../utils/OptionalSignal.js'
import { AccountAddress, EthereumAddress, EthereumQuantity } from '../../types/types.js'
import { AUGUR_CONTRACT, DAI_TOKEN_ADDRESS } from '../../utils/constants.js'
import { bigintToDecimalString, bigintToDecimalStringWithUnknown, bigintToDecimalStringWithUnknownAndPracticallyInfinite, decimalStringToBigint, formatUnixTimestampIso, isDecimalString } from '../../utils/ethereumUtils.js'
import { approveErc20Token, getAllowanceErc20Token } from '../../utils/erc20.js'
import { ReadClient, WriteClient } from '../../utils/ethereumWallet.js'
import { dateToBigintSeconds, isNumeric } from '../../utils/utils.js'
import { useEffect } from 'preact/hooks'
import { Input } from '../../SharedUI/Input.js'
import { useThrottledSignalEffect } from '../../SharedUI/useThrottledSignalEffect.js'

interface AllowancesProps {
	maybeWriteClient: OptionalSignal<WriteClient>
	universe: OptionalSignal<AccountAddress>
	reputationTokenAddress: OptionalSignal<AccountAddress>
	marketCreationCostDai: OptionalSignal<bigint>
	marketCreationCostRep: OptionalSignal<bigint>
	allowedRep: OptionalSignal<bigint>
	allowedDai: OptionalSignal<bigint>
}

export const Allowances = ( { maybeWriteClient, universe, reputationTokenAddress, marketCreationCostDai, marketCreationCostRep, allowedRep, allowedDai }: AllowancesProps) => {
	const daiAllowanceToBeSet = useOptionalSignal<bigint>(undefined)
	const repAllowanceToBeSet = useOptionalSignal<bigint>(undefined)
	const cannotSetDaiAllowance = useComputed(() => {
		if (maybeWriteClient.deepValue === undefined) return true
		if (daiAllowanceToBeSet.deepValue === undefined || daiAllowanceToBeSet.deepValue <= 0n) return true
		return false
	})
	const cannotSetRepAllowance = useComputed(() => {
		if (maybeWriteClient.deepValue === undefined) return true
		if (universe.deepValue === undefined) return true
		if (reputationTokenAddress.deepValue === undefined) return true
		if (repAllowanceToBeSet.deepValue === undefined || repAllowanceToBeSet.deepValue <= 0n) return true
		return false
	})

	const approveRep = async () => {
		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) throw new Error('missing writeClient')
		if (universe.deepValue === undefined) throw new Error('missing universe')
		if (reputationTokenAddress.deepValue === undefined) throw new Error('missing reputationV2Address')
		if (repAllowanceToBeSet.deepValue === undefined || repAllowanceToBeSet.deepValue <= 0n) throw new Error('not valid allowance')
		await approveErc20Token(writeClient, reputationTokenAddress.deepValue, universe.deepValue, repAllowanceToBeSet.deepValue)
		allowedRep.deepValue = await getAllowanceErc20Token(writeClient, reputationTokenAddress.deepValue, writeClient.account.address, universe.deepValue)
	}

	const approveDai = async () => {
		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) throw new Error('missing writeClient')
		if (daiAllowanceToBeSet.deepValue === undefined || daiAllowanceToBeSet.deepValue <= 0n) throw new Error('not valid allowance')
		await approveErc20Token(writeClient, DAI_TOKEN_ADDRESS, AUGUR_CONTRACT, daiAllowanceToBeSet.deepValue)
		allowedDai.deepValue = await getAllowanceErc20Token(writeClient, DAI_TOKEN_ADDRESS, writeClient.account.address, AUGUR_CONTRACT)
	}

	function setMaxRepAllowance() {
		repAllowanceToBeSet.deepValue = 2n ** 256n - 1n
	}
	function setMaxDaiAllowance() {
		daiAllowanceToBeSet.deepValue = 2n ** 256n - 1n
	}

	return <div class = 'form-grid'>
		<h3>Allowances</h3>
		<div style = { { display: 'grid', gap: '0.5em', gridTemplateColumns: 'auto auto auto' } }>
			<div style = { { alignContent: 'center' } }>
				Allowed DAI: { bigintToDecimalStringWithUnknownAndPracticallyInfinite(allowedDai.deepValue, 18n, 2) } DAI (required: { bigintToDecimalStringWithUnknown(marketCreationCostDai.deepValue, 18n, 2) } DAI)
			</div>
			<div style = { { display: 'flex', alignItems: 'baseline', gap: '0.5em' } }>
				<Input
					class = 'input reporting-panel-input'
					type = 'text'
					placeholder = 'REP to allow'
					disabled = { useComputed(() => false) }
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
				Allowed REP: { bigintToDecimalStringWithUnknownAndPracticallyInfinite(allowedRep.deepValue, 18n, 2) } REP (required: { bigintToDecimalStringWithUnknown(marketCreationCostRep.deepValue, 18n, 2) } REP)
			</div>
			<div style = { { display: 'flex', alignItems: 'baseline', gap: '0.5em' } }>
				<Input
					class = 'input reporting-panel-input'
					type = 'text'
					placeholder = 'DAI to allow'
					disabled = { useComputed(() => false) }
					style = { { maxWidth: '300px' } }
					value = { repAllowanceToBeSet }
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
				<span class = 'unit'>REP</span>
				<button class = 'button button-secondary button-small' style = { { whiteSpace: 'nowrap' } } onClick = { setMaxRepAllowance }>Max</button>
			</div>
			<button class = 'button button-secondary button-small' style = { { width: '100%', whiteSpace: 'nowrap' } } disabled = { cannotSetRepAllowance } onClick = { approveRep }>
				Set REP allowance
			</button>
		</div>
	</div>
}

interface CostsParams {
	marketCreationCostDai: OptionalSignal<bigint>
	marketCreationCostRep: OptionalSignal<bigint>
	baseFee: OptionalSignal<bigint>
	marketCreationCasCost: OptionalSignal<bigint>
}

export const Costs = ( { marketCreationCostDai, marketCreationCostRep, baseFee, marketCreationCasCost }: CostsParams) => {
	const ethCost = useComputed(() => marketCreationCasCost.deepValue === undefined || baseFee.deepValue === undefined ? '?' : bigintToDecimalStringWithUnknown(marketCreationCasCost.deepValue * baseFee.deepValue, 18n, 6))
	return <p>
		It costs <b> { ethCost.value } ETH</b>, <b>{ bigintToDecimalStringWithUnknown(marketCreationCostDai.deepValue, 18n, 2) } DAI </b> and <b>{ bigintToDecimalStringWithUnknown(marketCreationCostRep.deepValue, 18n, 2) } REP</b> to create a market. The REP will be returned to you after a succesfull initial report and the DAI will be returned to you if the market resolves to non-invalid.
	</p>
}

interface CreateYesNoMarketProps {
	maybeReadClient: OptionalSignal<ReadClient>
	maybeWriteClient: OptionalSignal<WriteClient>
	universe: OptionalSignal<AccountAddress>
	reputationTokenAddress: OptionalSignal<AccountAddress>
	daiBalance: OptionalSignal<bigint>
	repBalance: OptionalSignal<bigint>
}

const isValidDate = (dateStr: string): boolean => {
	const regex = /^\d{4}-\d{2}-\d{2}$/
	if (!regex.test(dateStr)) return false

	const date = new Date(dateStr)
	const [year, month, day] = dateStr.split('-').map(Number)

	return (
		date.getFullYear() === year &&
		date.getMonth() + 1 === month &&
		date.getDate() === day
	)
}

const affiliateFeeOptions = [0, 1, 2, 3, 4, 5, 10, 15, 20, 25, 50, 75, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map((divisor) => ({
	id: divisor,
	name: divisor === 0 ? "0.00%" : `${ (100 / divisor).toFixed(2) }%`
}))

export const CreateYesNoMarket = ({ maybeReadClient, maybeWriteClient, universe, reputationTokenAddress, daiBalance, repBalance }: CreateYesNoMarketProps) => {
	const endTime = useSignal<string>('')
	const feePerCashInAttoCash = useOptionalSignal<bigint>(0n)
	const affiliateValidator = useOptionalSignal<AccountAddress>('0x0000000000000000000000000000000000000000')
	const affiliateFeeDivisor = useOptionalSignal<number>(0)
	const designatedReporterAddress = useOptionalSignal<AccountAddress>(undefined)
	const description = useSignal<string>('')
	const longDescription = useSignal<string>('')
	const categories = useOptionalSignal<readonly string[]>(undefined)
	const tags = useOptionalSignal<readonly string[]>(undefined)
	const maximumMarketEndData = useOptionalSignal<bigint>(undefined)
	const marketCreationCostRep = useOptionalSignal<bigint>(undefined)
	const marketCreationCostDai = useOptionalSignal<bigint>(undefined)
	const allowedDai = useOptionalSignal<bigint>(undefined)
	const allowedRep = useOptionalSignal<bigint>(undefined)
	const marketCreationCasCost = useOptionalSignal<bigint>(undefined)
	const baseFee = useOptionalSignal<bigint>(undefined)

	const refresh = async () => {
		const readClient = maybeReadClient.deepPeek()
		if (readClient === undefined) return
		maximumMarketEndData.deepValue = await getMaximumMarketEndDate(readClient)
		if (universe.deepValue === undefined) return
		if (maybeWriteClient.deepValue === undefined || reputationTokenAddress.deepValue === undefined) return
		allowedRep.deepValue = await getAllowanceErc20Token(maybeWriteClient.deepValue, reputationTokenAddress.deepValue, maybeWriteClient.deepValue?.account.address, universe.deepValue)
		allowedDai.deepValue = await getAllowanceErc20Token(maybeWriteClient.deepValue, DAI_TOKEN_ADDRESS, maybeWriteClient.deepValue?.account.address, AUGUR_CONTRACT)
		marketCreationCostRep.deepValue = await getMarketRepBondForNewMarket(readClient, universe.deepValue)
		marketCreationCostDai.deepValue = await getValidityBond(readClient, universe.deepValue)
		baseFee.deepValue = (await readClient.getBlock()).baseFeePerGas || undefined
	}

	useEffect(() => {
		designatedReporterAddress.deepValue = maybeWriteClient.deepValue?.account.address
	}, [maybeWriteClient.deepValue?.account.address])

	useSignalEffect(() => {
		reputationTokenAddress.value
		universe.value
		maybeWriteClient.deepValue
		maybeReadClient.deepValue
		refresh()
	})

	const createMarketDisabled = useComputed(() => {
		if (universe.deepValue === undefined) return true
		if (!isValidDate(endTime.value)) return true
		const seconds = dateToBigintSeconds(new Date(endTime.value))
		if (maximumMarketEndData.deepValue === undefined) return true
		if (seconds > maximumMarketEndData.deepValue) return true
		if (affiliateValidator.deepValue === undefined) return true
		if (affiliateFeeDivisor.deepValue === undefined) return true
		if (designatedReporterAddress.deepValue === undefined) return true
		if (description.value.length === 0) return true
		if (longDescription.value.length === 0) return true
		if (longDescription.value.length < description.value.length) return true
		if (marketCreationCostRep.deepValue === undefined) return true
		if (marketCreationCostDai.deepValue === undefined) return true
		if (allowedRep.deepValue === undefined) return true
		if (allowedDai.deepValue === undefined) return true
		if (allowedRep.deepValue < marketCreationCostRep.deepValue) return true
		if (allowedDai.deepValue < marketCreationCostDai.deepValue) return true
		if (repBalance.deepValue === undefined) return true
		if (daiBalance.deepValue === undefined) return true
		if (repBalance.deepValue < marketCreationCostRep.deepValue) return true
		if (daiBalance.deepValue < marketCreationCostDai.deepValue) return true
		return false
	})

	const createMarket = async () => {
		if (universe.deepValue === undefined) throw new Error('missing universe')
		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) throw new Error('missing writeClient')
		if (!isValidDate(endTime.value)) throw new Error('missing endTime')
		const marketEndTimeUnixTimeStamp = dateToBigintSeconds(new Date(endTime.value))
		if (affiliateValidator.deepValue === undefined) throw new Error('missing affiliateValidator')
		if (affiliateFeeDivisor.deepValue === undefined) throw new Error('missing affiliateFeeDivisor')
		if (designatedReporterAddress.deepValue === undefined) throw new Error('missing designatedReporterAddress')
		if (description.value.length === 0) throw new Error('missing description')
		if (feePerCashInAttoCash.deepValue === undefined) throw new Error('missing feePerCashInAttoCash')
		const extraInfoString = JSON.stringify({
			description: description.value,
			longDescription: longDescription.value,
			categories: categories.deepValue?.filter((element) => element.length > 0) || [],
			tags: tags.deepValue?.filter((element) => element.length > 0) || []
		})
		await createYesNoMarket(universe.deepValue, writeClient, marketEndTimeUnixTimeStamp, feePerCashInAttoCash.deepValue, affiliateValidator.deepValue, BigInt(affiliateFeeDivisor.deepValue), designatedReporterAddress.deepValue, extraInfoString)
	}

	useThrottledSignalEffect(() => {
		feePerCashInAttoCash.deepValue
		affiliateValidator.deepValue
		affiliateFeeDivisor.deepValue
		designatedReporterAddress.deepValue
		description.value
		longDescription.value
		categories.value
		tags.value
		return () => {
			const marketEndTimeUnixTimeStamp = isValidDate(endTime.value) ? dateToBigintSeconds(new Date(endTime.value)) : maximumMarketEndData.deepValue
			const extraInfoString = JSON.stringify({
				description: description.value,
				longDescription: longDescription.value,
				categories: categories.deepValue?.filter((element) => element.length > 0) || [],
				tags: tags.deepValue?.filter((element) => element.length > 0) || []
			})
			const feePerCashInAttoCashValue = feePerCashInAttoCash.deepValue || 0n
			const affiliateValidatorValue = affiliateValidator.deepValue || '0x0000000000000000000000000000000000000000'
			const affiliateFeeDivisorValue = affiliateFeeDivisor.deepValue || 0
			const designatedReporterAddressValue = designatedReporterAddress.deepValue || '0x0000000000000000000000000000000000000000'
			const estimate = async () => {
				if (universe.deepValue === undefined) return
				const readClient = maybeReadClient.deepPeek()
				if (readClient === undefined) return
				if (marketEndTimeUnixTimeStamp === undefined) return
				marketCreationCasCost.deepValue = await estimateGasCreateYesNoMarket(universe.deepValue, readClient, marketEndTimeUnixTimeStamp, feePerCashInAttoCashValue, affiliateValidatorValue, BigInt(affiliateFeeDivisorValue), designatedReporterAddressValue, extraInfoString)
			}
			estimate()
		}
	}, 5000)

	useSignalEffect(() => {
		reputationTokenAddress.value
		universe.value
		maybeWriteClient.deepValue
		maybeReadClient.deepValue
		refresh()
	})

	function handleEndTimeInput(value: string) {
		endTime.value = value
	}
	function handleAffiliateFee(value: string) {
		if (!isNumeric(value)) throw new Error('Affiliate fee is not numeric')
		affiliateFeeDivisor.deepValue = Number(value)
	}
	function handleDescription(value: string) {
		description.value = value
	}
	function handleLongDescription(value: string) {
		longDescription.value = value
	}

	return <section class = 'create-market'>
		<div class = 'form-grid'>
			<div class = 'form-group'>
				<label>Title</label>
				<input
					class = 'input'
					type = 'text'
					placeholder = 'How many goats...'
					value = { description.value }
					onInput = { e => handleDescription(e.currentTarget.value) }
				/>
			</div>

			<div class = 'form-group'>
				<label>
					End Time (UTC){ ' ' }
					{ maximumMarketEndData.deepValue !== undefined && (
						<span class = 'note-text'>
							(Latest allowed date { formatUnixTimestampIso(maximumMarketEndData.deepValue) })
						</span>
					) }
				</label>
				<input
					class = 'input'
					type = 'date'
					value = { endTime.value }
					onInput = { e => handleEndTimeInput(e.currentTarget.value) }
				/>
			</div>

			<div class = 'form-group'>
				<label>Market Creator Fee (%)</label>
				<Input
					class = 'input reporting-panel-input'
					type = 'text'
					placeholder = '0'
					disabled = { useSignal(false) }
					value = { feePerCashInAttoCash }
					sanitize = { (amount: string) => amount.trim() }
					tryParse = { (amount: string | undefined) => {
						if (amount === undefined) return { ok: false } as const
						if (!isDecimalString(amount.trim())) return { ok: false } as const
						const parsed = decimalStringToBigint(amount.trim(), 16n)
						if (parsed < 0n) return { ok: false } as const
						if (parsed > 100n * 10n ** 16n) return { ok: false } as const
						return { ok: true, value: parsed } as const
					}}
					serialize = { (amount: EthereumQuantity | undefined) => {
						if (amount === undefined) return ''
						return bigintToDecimalString(amount, 16n, 16)
					}}
					invalidSignal = { useSignal<boolean>(false) }
				/>
			</div>

			<div class = 'form-group'>
				<label>Affiliate Validator Address</label>
				<Input
					style = 'height: fit-content;'
					key = 'affiliateValidator-address'
					class = 'input'
					type = 'text'
					width = '100%'
					placeholder = '0x...'
					value = { affiliateValidator }
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
					invalidSignal = { useSignal<boolean>(false) }
				/>
			</div>

			<div class = 'form-group'>
				<label>Affiliate Fee (%)</label>
				<select class = 'styled-select' onInput = { e => handleAffiliateFee(e.currentTarget.value) } value = { affiliateFeeOptions.find(f => f.id === affiliateFeeDivisor.deepValue)?.id }>
					{ affiliateFeeOptions.map(fee => (
						<option key = { fee.id } value = { fee.id }>
							{ fee.name }
						</option>
					)) }
				</select>
			</div>

			<div class = 'form-group'>
				<label>Designated Reporter Address</label>
				<Input
					style = 'height: fit-content;'
					key = 'designated-reporter-address'
					class = 'input'
					type = 'text'
					width = '100%'
					placeholder = '0x...'
					value = { designatedReporterAddress }
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
					invalidSignal = { useSignal<boolean>(false) }
				/>
			</div>

			<div class = 'form-group'>
				<label>Long Description</label>
				<textarea
					class = 'input'
					placeholder = 'This market resolves...'
					style = { { minHeight: '100px', height: '200px',resize: 'vertical' } }
					value = { longDescription.value }
					onInput = { e => handleLongDescription(e.currentTarget.value) }
				/>
			</div>

			<div class = 'form-group'>
				<label>Categories (comma separated)</label>
				<Input
					style = 'height: fit-content;'
					key = 'designated-reporter-address'
					class = 'input'
					type = 'text'
					width = '100%'
					placeholder = 'Cryptocurrency, goats'
					value = { categories }
					sanitize = { (addressString: string) => addressString }
					tryParse = { (maybeStringSeparatedArray: string | undefined) => {
						if (maybeStringSeparatedArray === undefined) return { ok: false } as const
						const categories = maybeStringSeparatedArray.split(',').map((element) => element.trim())
						return { ok: true, value: categories } as const
					}}
					serialize = { (marketAddressString: readonly string[] | undefined) => {
						if (marketAddressString === undefined) return ''
						return marketAddressString.join(', ')
					} }
					invalidSignal = { useSignal<boolean>(false) }
				/>
			</div>

			<div class = 'form-group'>
				<label>Tags (comma separated)</label>
				<Input
					style = 'height: fit-content;'
					key = 'designated-reporter-address'
					class = 'input'
					type = 'text'
					width = '100%'
					placeholder = 'Tardigrades, Eggs'
					value = { tags }
					sanitize = { (addressString: string) => addressString }
					tryParse = { (maybeStringSeparatedArray: string | undefined) => {
						if (maybeStringSeparatedArray === undefined) return { ok: false } as const
						const categories = maybeStringSeparatedArray.split(',').map((element) => element.trim())
						return { ok: true, value: categories } as const
					}}
					serialize = { (marketAddressString: readonly string[] | undefined) => {
						if (marketAddressString === undefined) return ''
						return marketAddressString.join(', ')
					} }
					invalidSignal = { useSignal<boolean>(false) }
				/>
			</div>
		</div>

		<Allowances maybeWriteClient = { maybeWriteClient } universe = { universe } reputationTokenAddress = { reputationTokenAddress } marketCreationCostRep = { marketCreationCostRep } marketCreationCostDai = { marketCreationCostDai } allowedRep = { allowedRep } allowedDai = { allowedDai }/>

		<Costs marketCreationCostRep = { marketCreationCostRep } marketCreationCostDai = { marketCreationCostDai } baseFee = { baseFee } marketCreationCasCost = { marketCreationCasCost }/>
		<div class = 'button-group'>
			<button class = 'button button-primary' onClick = { createMarket } disabled = { createMarketDisabled.value } style = { { width: '100%' } }>
				Create Market
			</button>
		</div>
	</section>
}
