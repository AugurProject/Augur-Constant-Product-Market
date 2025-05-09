import { AccountAddress, EthereumAddress } from '../types/types.js'
import { DEFAULT_UNIVERSE } from './constants.js'
import { addressString } from './ethereumUtils.js'

export const parseHashPath = (hashBasedPath: string, allowedTabPaths: string[]) => {
	const [pathPart, params] = hashBasedPath.replace('#/', '').split('?')
	const tabIndex = allowedTabPaths.findIndex((tabPath) => tabPath === pathPart)
	const extractAddressParam = (params: string | undefined, what: string) => {
		const searchParams = new URLSearchParams(params)
		const foundParam = searchParams.get(what)
		if (foundParam === null) return { type: 'notFound' } as const
		const parsed = EthereumAddress.safeParse(foundParam)
		if (parsed.success) return { type: 'found', address: addressString(parsed.value) } as const
		return { type: 'foundAndInvalid' } as const
	}
	return {
		tabIndex,
		universe: extractAddressParam(params, 'universe'),
		selectedMarket: extractAddressParam(params, 'market'),
	}
}

export const paramsToHashPath = (tabPath: string, market: AccountAddress | undefined, universe: AccountAddress | undefined) => {
	if (market === undefined && universe === undefined) return `#/${ tabPath }`
	const params = [
		{ name: 'market', address: market },
		{ name: 'universe', address: universe === DEFAULT_UNIVERSE ? undefined : universe },
	].filter((param) => param.address !== undefined)
	const searchTerms = params.map((param) => `${ param.name }=${ param.address }`).join('&')
	const withQuestionMark = searchTerms.length > 0 ? `?${ searchTerms }` : ''
	return `#/${ tabPath }${ withQuestionMark }`
}
