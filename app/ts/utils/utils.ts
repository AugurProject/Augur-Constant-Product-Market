export const bigintSecondsToDate = (seconds: bigint) => {
	if (seconds > Number.MAX_SAFE_INTEGER) throw new Error(`Too big seconds value: ${ seconds }`)
	if (seconds < 0) throw new Error(`Got negative seconds: ${ seconds }`)
	return new Date(Number(seconds) * 1000)
}

export const dateToBigintSeconds = (date: Date) => BigInt(date.getTime()) / 1000n

export function humanReadableDateDelta(secondsDiff: number) {
	if (secondsDiff <= 0) return '0 seconds'
	if (secondsDiff > 3600 * 24 * 1.5) return `${ Math.floor((secondsDiff + 1800) / 3600 / 24) } days`
	if (secondsDiff > 3600 * 1.5) return `${ Math.floor((secondsDiff + 1800) / 3600) } hours`
	if (secondsDiff > 60 * 1.5) return `${ Math.floor((secondsDiff + 30) / 60) } minutes`
	return `${ Math.floor(secondsDiff + 0.5) } seconds`
}

export const humanReadableDateDeltaFromTo = (from: Date, to: Date) => humanReadableDateDelta(Number(dateToBigintSeconds(to) - dateToBigintSeconds(from)))
