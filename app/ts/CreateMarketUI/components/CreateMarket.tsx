import { useSignal } from '@preact/signals'
import { createYesNoMarket, getMaximumMarketEndDate } from '../../utils/augurContractUtils.js'
import { OptionalSignal, useOptionalSignal } from '../../utils/OptionalSignal.js'
import { AccountAddress, EthereumAddress, EthereumQuantity, NonHexBigInt } from '../../types/types.js'
import { AUGUR_CONTRACT, DAI_TOKEN_ADDRESS } from '../../utils/constants.js'
import { addressString, decimalStringToBigint, formatUnixTimestampISO, isDecimalString } from '../../utils/ethereumUtils.js'
import { approveErc20Token } from '../../utils/erc20.js'
import { ReadClient, WriteClient } from '../../utils/ethereumWallet.js'
import { dateToBigintSeconds } from '../../utils/utils.js'

interface CreateYesNoMarketProps {
	maybeReadClient: OptionalSignal<ReadClient>
	maybeWriteClient: OptionalSignal<WriteClient>
	universe: OptionalSignal<AccountAddress>
	reputationTokenAddress: OptionalSignal<AccountAddress>
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

export const CreateYesNoMarket = ({ maybeReadClient, maybeWriteClient, universe, reputationTokenAddress }: CreateYesNoMarketProps) => {
	const endTime = useSignal<string>('')
	const marketCreatorFee = useSignal<string>('')
	const affiliateValidator = useSignal<string>('0x0000000000000000000000000000000000000000')
	const affiliateFeeDivisor = useSignal<string>('')
	const designatedReporterAddress = useSignal<string>('')
	const description = useSignal<string>('')
	const longDescription = useSignal<string>('')
	const categories = useSignal<string>('')
	const tags = useSignal<string>('')
	const maxiumMarketEndData = useOptionalSignal<bigint>(undefined)

	const fetchMarketCreationInformation = async () => {
		const readClient = maybeReadClient.deepPeek()
		if (readClient === undefined) throw new Error('missing account')
		maxiumMarketEndData.deepValue = await getMaximumMarketEndDate(readClient)
	}

	const createMarket = async () => {
		if (universe.deepValue === undefined) throw new Error('missing universe')
		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) throw new Error('missing writeClient')
		console.log(endTime.value)
		if (!isDecimalString(marketCreatorFee.value)) throw new Error('missing feePerCashInAttoCash')
		const parsedFeePerCashInAttoCash = decimalStringToBigint(marketCreatorFee.value, 16n) //16n instead of 18n as we are converting from percentage
		const parsedAffiliateValidator = EthereumAddress.safeParse(affiliateValidator.value)
		const parsedAffiliateFeeDivisor = NonHexBigInt.safeParse(affiliateFeeDivisor.value)
		const parsedDesignatedReporterAddress = EthereumQuantity.safeParse(designatedReporterAddress.value)
		if (!isValidDate(endTime.value)) throw new Error('missing endTime')
		const marketEndTimeUnixTimeStamp = dateToBigintSeconds(new Date(endTime.value))
		if (!parsedAffiliateValidator.success) throw new Error('missing affiliateValidator')
		if (!parsedAffiliateFeeDivisor.success) throw new Error('missing affiliateFeeDivisor')
		if (!parsedDesignatedReporterAddress.success) throw new Error('missing designatedReporterAddress')
		if (description.value.length === 0) throw new Error('missing description')
		const extraInfoString = JSON.stringify({
			description: description.value,
			longDescription: longDescription.value,
			categories: categories.value.split(',').map((category) => category.trim()).filter((category) => category.length > 0),
			tags: categories.value.split(',').map((tag) => tag.trim()).filter((tag) => tag.length > 0)
		})
		await createYesNoMarket(universe.deepValue, writeClient, marketEndTimeUnixTimeStamp, parsedFeePerCashInAttoCash, addressString(parsedAffiliateValidator.value), parsedAffiliateFeeDivisor.value, addressString(parsedDesignatedReporterAddress.value), extraInfoString)
	}

	const approveRep = async () => {
		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) throw new Error('missing writeClient')
		if (universe.deepValue === undefined) throw new Error('missing universe')
		if (reputationTokenAddress.deepValue === undefined) throw new Error('missing reputationV2Address')
		return await approveErc20Token(writeClient, reputationTokenAddress.deepValue, universe.deepValue, 10000n * 10n ** 18n)
	}

	const approveDai = async () => {
		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) throw new Error('missing writeClient')
		return await approveErc20Token(writeClient, DAI_TOKEN_ADDRESS, AUGUR_CONTRACT, 10000n * 10n ** 18n)
	}

	function handleEndTimeInput(value: string) {
		endTime.value = value
	}
	function handleMarketCreatorFee(value: string) {
		marketCreatorFee.value = value
	}
	function handleAffiliateValidator(value: string) {
		affiliateValidator.value = value
	}
	function handleAffiliateFee(value: string) {
		affiliateFeeDivisor.value = value
	}
	function handleDesignatedReporterAddress(value: string) {
		designatedReporterAddress.value = value
	}
	function handleDescription(value: string) {
		description.value = value
	}
	function handleLongDescription(value: string) {
		longDescription.value = value
	}
	function handleTags(value: string) {
		tags.value = value
	}
	function handleCategories(value: string) {
		categories.value = value
	}

	return <div class = 'subApplication'>
		<button class = 'button is-primary' onClick = { fetchMarketCreationInformation }>Refresh market creation data</button>
		<p style = 'margin: 0;'>Create Market:</p>
		<div style = 'display: grid; width: 100%; gap: 10px;'>
			<p style = 'margin: 0;'>End Time (UTC): { maxiumMarketEndData.deepValue !== undefined ? <>(Latest allowed date { formatUnixTimestampISO(maxiumMarketEndData.deepValue) })</> : <></> }</p>
			<input
				style = 'height: fit-content;'
				class = 'input'
				type = 'date'
				width = '100%'
				placeholder = '01/01/2024'
				value = { endTime.value }
				onInput = { e => handleEndTimeInput(e.currentTarget.value) }
			/>
			<p style = 'margin: 0;'>Market Creator Fee (%):</p>
			<input
				style = 'height: fit-content;'
				class = 'input'
				type = 'text'
				width = '100%'
				placeholder = '1'
				value = { marketCreatorFee.value }
				onInput = { e => handleMarketCreatorFee(e.currentTarget.value) }
			/>
			<div>
				<p style = 'margin: 0;'>Affiliate Validator Address:</p>
				<input
					style = 'height: fit-content;'
					class = 'input'
					type = 'text'
					width = '100%'
					placeholder = '0x...'
					value = { affiliateValidator.value }
					onInput = { e => handleAffiliateValidator(e.currentTarget.value) }
				/>
				<p style = 'margin: 0;'>Affiliate Fee (%):</p>
				<select onInput = { e => handleAffiliateFee(e.currentTarget.value) }>
					{ affiliateFeeOptions.map((fee) => (
						<option key = { fee.id } value = { fee.id }>
							{ fee.name }
						</option>
					)) }
				</select>
			</div>
			<p style = 'margin: 0;'>Designated Reporter Address:</p>
			<input
				style = 'height: fit-content;'
				class = 'input'
				type = 'text'
				width = '100%'
				placeholder = '0x...'
				value = { designatedReporterAddress.value }
				onInput = { e => handleDesignatedReporterAddress(e.currentTarget.value) }
			/>
			<div>
				<p style = 'margin: 0;'>Description:</p>
				<input
					style = 'height: fit-content; width: 100%'
					class = 'input'
					type = 'text'
					placeholder = 'How many goats...'
					value = { description.value }
					onInput = { e => handleDescription(e.currentTarget.value) }
				/>
				<p style = 'margin: 0;'>Long description:</p>
				<textarea
					style = 'height: fit-content; width: 100%'
					placeholder = 'This market resolves...'
					value = { longDescription.value }
					onInput = { e => handleLongDescription(e.currentTarget.value) }
				/>
				<p style = 'margin: 0;'>Categories (comma separated):</p>
				<input
					style = 'height: fit-content; width: 100%'
					class = 'input'
					type = 'text'
					placeholder = 'cryptocurrency, goats...'
					value = { categories.value }
					onInput = { e => handleCategories(e.currentTarget.value) }
				/>
				<p style = 'margin: 0;'>Tags (comma separated):</p>
				<input
					style = 'height: fit-content; width: 100%'
					class = 'input'
					type = 'text'
					placeholder = 'cryptocurrency, goats...'
					value = { tags.value }
					onInput = { e => handleTags(e.currentTarget.value) }
				/>
			</div>
			<button class = 'button is-primary' onClick = { createMarket }>Create Market</button>
			<button class = 'button is-primary' onClick = { approveRep }>Approve REP</button>
			<button class = 'button is-primary' onClick = { approveDai }>Approve DAI</button>
		</div>
	</div>
}
