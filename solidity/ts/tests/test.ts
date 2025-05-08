import { describe, beforeEach, test } from 'node:test'
import { getMockedEthSimulateWindowEthereum, MockWindowEthereum } from '../testsuite/simulator/MockWindowEthereum.js'
import { createWriteClient } from '../testsuite/simulator/utils/viem.js'
import { SHARE_TOKEN, TEST_ADDRESSES, UNIV4_MAX_TICK, UNIV4_MIN_TICK, UNIV4_POOL_MANAGER, UNIV4_POSITION_MANAGER, YEAR_2030 } from '../testsuite/simulator/utils/constants.js'
import { deployAugurConstantProductMarket, approveCash, getCashAllowance, setERC1155Approval, setupTestAccounts, getAugurConstantProductMarketRouterAddress, getMarketAddress, getPoolLiquidityBalance, getCashBalance, mintLiquidity, getNextPositionManagerToken, getExpectedLiquidity, getShareBalances, decreaseLiquidity, getReportingFee, burnLiquidity, increaseLiquidity, expectedSharesAfterSwap, enterPosition, expectedSharesNeededForSwap, exitPosition, swapExactIn, swapExactOut, getNumMarkets, getMarkets, getLpTokens, getMarketIsValid, unwrapLpToken, getOwnerOfPositionManagerToken, decreaseLiquidityCall, burnLiquidityCall, getExactShareEnterEstimate, getShareSplit } from '../testsuite/simulator/utils/utilities.js'
import assert from 'node:assert'
import { addressString } from '../testsuite/simulator/utils/bigint.js'

const numTicks = 1000n

describe('Contract Test Suite', () => {

	let mockWindow: MockWindowEthereum

	beforeEach(async () => {
		mockWindow = getMockedEthSimulateWindowEthereum()
		await setupTestAccounts(mockWindow)
	})

	test('canDeployContractAndCannotDupe', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		await deployAugurConstantProductMarket(client)
		const augurMarketAddress = await getMarketAddress()
		const isDeployed = await getMarketIsValid(client, augurMarketAddress)
		assert.ok(isDeployed, `Not Deployed!`)

		// Another ACPM cannot be deployed for the same market
		assert.rejects(deployAugurConstantProductMarket(client, true), `New ACPM was created for the same market`)
	})

	test('canAddAndRemoveLiquidity', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const badClient = createWriteClient(mockWindow, TEST_ADDRESSES[1], 0)
		await deployAugurConstantProductMarket(client)

		// Approve Dai for ACPM

		await approveCash(client)
		const allowance = await getCashAllowance(client)
		assert.notEqual(allowance, 0n, `Approve failed`)

		// Approve Share Token

		const router = await getAugurConstantProductMarketRouterAddress()
		await setERC1155Approval(client, addressString(SHARE_TOKEN), router, true)

		const originalDaiBalance = await getCashBalance(client)

		const setsToBuy = 10000000n
		const expectedCost = setsToBuy * numTicks

		const expectedLiquidity = await getExpectedLiquidity(client, UNIV4_MIN_TICK, UNIV4_MAX_TICK, setsToBuy, setsToBuy)

		// Provide Liquidity
		const positionTokenId = await getNextPositionManagerToken(client)
		await mintLiquidity(client, setsToBuy, UNIV4_MIN_TICK, UNIV4_MAX_TICK, setsToBuy, setsToBuy, YEAR_2030)

		const lpBalance = await getPoolLiquidityBalance(client, positionTokenId)

		assert.strictEqual(lpBalance, expectedLiquidity, `Liquidity not bought correctly`)
		const daiBalanceAfterBuy = await getCashBalance(client)
		assert.strictEqual(originalDaiBalance - daiBalanceAfterBuy, expectedCost, `Dai not removed as expected. Costed ${originalDaiBalance - daiBalanceAfterBuy}. Expected: ${expectedCost}`)

		const liquidityProviderShareBalances = await getShareBalances(client, client.account.address)
		assert.strictEqual(liquidityProviderShareBalances[0], setsToBuy, `Liquidity provider did not receive Invalid shares`)
		assert.strictEqual(liquidityProviderShareBalances[1], 0n, `Liquidity provider did not provide all no shares`)
		assert.strictEqual(liquidityProviderShareBalances[2], 0n, `Liquidity provider did not provide all yes shares`)

		// Increase Liquidity
		const expectedIncreaseLiquidity = await getExpectedLiquidity(client, UNIV4_MIN_TICK, UNIV4_MAX_TICK, setsToBuy, setsToBuy)
		const expectedLiquidityAfterIncrease = expectedLiquidity + expectedIncreaseLiquidity

		// Other user cannot do liquidity operations on their token
		assert.rejects(increaseLiquidity(badClient, positionTokenId, setsToBuy, setsToBuy, setsToBuy, YEAR_2030))

		await increaseLiquidity(client, positionTokenId, setsToBuy, setsToBuy, setsToBuy, YEAR_2030)
		const lpBalanceAfterIncrease = await getPoolLiquidityBalance(client, positionTokenId)

		assert.strictEqual(lpBalanceAfterIncrease, expectedLiquidityAfterIncrease, `Liquidity not bought correctly`)
		const daiBalanceAfterIncrease = await getCashBalance(client)
		assert.strictEqual(daiBalanceAfterBuy - daiBalanceAfterIncrease, expectedCost, `Dai not removed as expected. Costed ${originalDaiBalance - daiBalanceAfterBuy}. Expected: ${expectedCost}`)

		const liquidityProviderShareBalancesAfterIncrease = await getShareBalances(client, client.account.address)
		assert.strictEqual(liquidityProviderShareBalancesAfterIncrease[0], setsToBuy * 2n, `Liquidity provider did not receive Invalid shares`)
		assert.strictEqual(liquidityProviderShareBalancesAfterIncrease[1], 0n, `Liquidity provider did not provide all no shares`)
		assert.strictEqual(liquidityProviderShareBalancesAfterIncrease[2], 0n, `Liquidity provider did not provide all yes shares`)

		// Remove Partial Liquidity (10%)
		const setsAfterIncrease = setsToBuy * 2n
		const partialLiquidityRemovalAmount = expectedLiquidityAfterIncrease / 10n
		const expectedSharesReturned = (setsAfterIncrease / 10n) - 1n;
		const expectedLiquidityAfterRemoval = expectedLiquidityAfterIncrease - partialLiquidityRemovalAmount

		// Other user cannot do liquidity operations on their token
		assert.rejects(decreaseLiquidity(badClient, positionTokenId, partialLiquidityRemovalAmount, expectedSharesReturned, expectedSharesReturned, YEAR_2030))

		// We can do a call to find the expected results of the decrease liquidity operation
		const decreaseResults = await decreaseLiquidityCall(client, positionTokenId, partialLiquidityRemovalAmount, expectedSharesReturned, expectedSharesReturned, YEAR_2030)

		await decreaseLiquidity(client, positionTokenId, partialLiquidityRemovalAmount, expectedSharesReturned, expectedSharesReturned, YEAR_2030)
		const newLPBalance = await getPoolLiquidityBalance(client, positionTokenId)
		assert.strictEqual(newLPBalance, expectedLiquidityAfterRemoval, `Liquidity not removed correctly`)

		const reportingFee = await getReportingFee(client)
		const daiBalanceAfterPartialRemoval = await getCashBalance(client)
		const expectedBaseReturn = expectedSharesReturned * numTicks
		const expectedReturnAfterFee = expectedBaseReturn - (expectedBaseReturn / reportingFee)
		const expectedDaiBalanceAfterPartialRemoval = daiBalanceAfterIncrease + expectedReturnAfterFee
		assert.strictEqual(expectedBaseReturn, decreaseResults[0] * numTicks)
		assert.strictEqual(daiBalanceAfterPartialRemoval, expectedDaiBalanceAfterPartialRemoval, `Dai not returned as expected. Got ${daiBalanceAfterPartialRemoval}. Expected: ${expectedDaiBalanceAfterPartialRemoval}`)

		const shareBalances = await getShareBalances(client, client.account.address)
		assert.strictEqual(shareBalances[0], setsAfterIncrease - expectedSharesReturned, `User did not lose Invalid shares when removing partial liquidity`)
		assert.strictEqual(shareBalances[1], 0n, `User received No shares incorrectly`)
		assert.strictEqual(shareBalances[2], 0n, `User received Yes shares incorrectly`)

		assert.strictEqual(decreaseResults[0], expectedSharesReturned, `Complete set call result was wrong`)
		assert.strictEqual(decreaseResults[1], 0n, `No share call result was wrong`)
		assert.strictEqual(decreaseResults[2], 0n, `Yes share call result was wrong`)

		// Burn Liquidity
		const expectedFinalSharesReturned = setsAfterIncrease - expectedSharesReturned - 2n // Minimum liquidity constraint

		// Other user cannot do liquidity operations on their token
		assert.rejects(burnLiquidity(badClient, positionTokenId, expectedFinalSharesReturned, expectedFinalSharesReturned, YEAR_2030))

		const burnResults = await burnLiquidityCall(client, positionTokenId, expectedFinalSharesReturned, expectedFinalSharesReturned, YEAR_2030)

		await burnLiquidity(client, positionTokenId, expectedFinalSharesReturned, expectedFinalSharesReturned, YEAR_2030)
		const daiBalance = await getCashBalance(client)
		const expectedDaiFromBurn = expectedFinalSharesReturned * numTicks
		const expectedDaiBalance = daiBalanceAfterPartialRemoval + expectedDaiFromBurn - (expectedDaiFromBurn / reportingFee)
		assert.strictEqual(expectedDaiFromBurn, burnResults[0] * numTicks)
		assert.strictEqual(daiBalance, expectedDaiBalance, `Dai not returned as expected. Got ${daiBalance}. Expected: ${expectedDaiBalance}`)

		const finalShareBalances = await getShareBalances(client, client.account.address)
		assert.strictEqual(finalShareBalances[0], 2n, `User received excess Invalid shares incorrectly`)
		assert.strictEqual(finalShareBalances[1], 0n, `User received No shares incorrectly`)
		assert.strictEqual(finalShareBalances[2], 0n, `User received Yes shares incorrectly`)

		assert.strictEqual(burnResults[0], expectedFinalSharesReturned, `Complete set call results was wrong`)
		assert.strictEqual(burnResults[1], 0n, `No share call result was wrong`)
		assert.strictEqual(burnResults[2], 0n, `Yes share call result was wrong`)
	})

	test('canUnwrapLpToken', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const client2 = createWriteClient(mockWindow, TEST_ADDRESSES[1], 0)
		await deployAugurConstantProductMarket(client)

		const setsToBuy = 10000000n
		await approveCash(client)
		const router = await getAugurConstantProductMarketRouterAddress()
		const shareTokenAddress = addressString(SHARE_TOKEN)
		await setERC1155Approval(client, shareTokenAddress, router, true)

		const positionTokenId = await getNextPositionManagerToken(client)
		await mintLiquidity(client, setsToBuy, UNIV4_MIN_TICK, UNIV4_MAX_TICK, setsToBuy, setsToBuy, YEAR_2030)

		const firstOwner = await getOwnerOfPositionManagerToken(client, positionTokenId)
		assert.strictEqual(firstOwner.toLowerCase(), router.toLowerCase())

		// Other user cannot take their LP token
		assert.rejects(unwrapLpToken(client2, positionTokenId))

		await unwrapLpToken(client, positionTokenId)
		const newOwner = await getOwnerOfPositionManagerToken(client, positionTokenId)

		assert.strictEqual(newOwner.toLowerCase(), client.account.address.toLowerCase())
	})

	test('canEnterAndExitYesPosition', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const participantClient1 = createWriteClient(mockWindow, TEST_ADDRESSES[1], 0)
		await deployAugurConstantProductMarket(client)

		const setsToBuy = 10000000n
		await approveCash(client)
		await approveCash(participantClient1)
		const router = await getAugurConstantProductMarketRouterAddress()
		const shareTokenAddress = addressString(SHARE_TOKEN)
		await setERC1155Approval(client, shareTokenAddress, router, true)
		await setERC1155Approval(participantClient1, shareTokenAddress, router, true)

		await mintLiquidity(client, setsToBuy, UNIV4_MIN_TICK, UNIV4_MAX_TICK, setsToBuy, setsToBuy, YEAR_2030)

		const originalDaiBalance = await getCashBalance(participantClient1)

		// Enter position
		const amountInDai = 50000n
		const baseSharesExpected = amountInDai / numTicks
		const expectedSwapShares = await expectedSharesAfterSwap(participantClient1, false, baseSharesExpected)
		const expectedYesShares = baseSharesExpected + expectedSwapShares

		// Deadline check works
		assert.rejects(enterPosition(participantClient1, amountInDai, true, 0n, 0n))

		// minSharesOut check works
		assert.rejects(enterPosition(participantClient1, amountInDai, true, expectedYesShares + 1n))

		await enterPosition(participantClient1, amountInDai, true)

		const shareBalances = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalances[0], baseSharesExpected, `Did not receive expected Invalid shares when purchasing Yes: Got ${shareBalances[0]}. Expected: ${baseSharesExpected}`)
		assert.strictEqual(shareBalances[1], 0n, `Recieved No shares when purchasing Yes`)
		assert.strictEqual(shareBalances[2], expectedYesShares, `Did not recieve expected Yes shares when purchasing Yes: Got ${shareBalances[2]}. Expected: ${expectedYesShares}`)

		const daiBalance = await getCashBalance(participantClient1)
		const expectedDaiBalance = originalDaiBalance - amountInDai
		assert.strictEqual(daiBalance, expectedDaiBalance, `Dai not sent as expected. Balance: ${daiBalance}. Expected: ${expectedDaiBalance}`)

		// Exit Position
		const setsToSell = shareBalances[0] - 4n
		const yesNeededForSwap = await expectedSharesNeededForSwap(participantClient1, true, setsToSell)
		const yesSharesNeeded = setsToSell + yesNeededForSwap
		const expectedDaiFromShares = setsToSell * numTicks
		await setERC1155Approval(participantClient1, shareTokenAddress, router, true)

		// Deadline check works
		assert.rejects(exitPosition(participantClient1, expectedDaiFromShares, yesSharesNeeded, 0n))

		// maxSharesSwapped check works
		assert.rejects(exitPosition(participantClient1, expectedDaiFromShares, yesSharesNeeded - 1n))

		await exitPosition(participantClient1, expectedDaiFromShares)

		const reportingFee = await getReportingFee(participantClient1)
		const daiBalanceAfterExit = await getCashBalance(participantClient1)
		const expectedDaiFromSharesAfterReportingFee = expectedDaiFromShares - (expectedDaiFromShares / reportingFee)
		const expectedDaiBalanceAfterExit = expectedDaiBalance + expectedDaiFromSharesAfterReportingFee
		assert.strictEqual(daiBalanceAfterExit, expectedDaiBalanceAfterExit, `Dai not recieved as expected. Balance ${daiBalanceAfterExit}. Expected: ${expectedDaiBalanceAfterExit}`)

		const shareBalancesAfterExit = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalancesAfterExit[0], 4n, `Did not close out Invalid position when exiting Yes position`)
		assert.strictEqual(shareBalancesAfterExit[1], 0n, `Recieved No shares when exiting a Yes position`)
		assert.strictEqual(shareBalancesAfterExit[2], 1n, `Did not close out Yes position when exiting Yes position`)
	})

	test('canEnterAndExitNoPosition', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const participantClient1 = createWriteClient(mockWindow, TEST_ADDRESSES[1], 0)
		await deployAugurConstantProductMarket(client)

		const setsToBuy = 10000000n
		await approveCash(client)
		await approveCash(participantClient1)
		const router = await getAugurConstantProductMarketRouterAddress()
		const shareTokenAddress = addressString(SHARE_TOKEN)
		await setERC1155Approval(client, shareTokenAddress, router, true)
		await setERC1155Approval(participantClient1, shareTokenAddress, router, true)

		await mintLiquidity(client, setsToBuy, UNIV4_MIN_TICK, UNIV4_MAX_TICK, setsToBuy, setsToBuy, YEAR_2030)

		const originalDaiBalance = await getCashBalance(participantClient1)

		// Enter position
		const amountInDai = 50000n
		const baseSharesExpected = amountInDai / numTicks
		const expectedSwapShares = await expectedSharesAfterSwap(participantClient1, true, baseSharesExpected)
		const expectedNoShares = baseSharesExpected + expectedSwapShares

		// Deadline check works
		assert.rejects(enterPosition(participantClient1, amountInDai, false, 0n, 0n))

		// minSharesOut check works
		assert.rejects(enterPosition(participantClient1, amountInDai, false, expectedNoShares + 1n))

		await enterPosition(participantClient1, amountInDai, false)

		const shareBalances = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalances[0], baseSharesExpected, `Did not receive expected Invalid shares when purchasing No: Got ${shareBalances[0]}. Expected: ${baseSharesExpected}`)
		assert.strictEqual(shareBalances[1], expectedNoShares, `Did not recieve expected No shares when purchasing No: Got ${shareBalances[1]}. Expected: ${expectedNoShares}`)
		assert.strictEqual(shareBalances[2], 0n, `Recieved Yes shares when purchasing No`)

		const daiBalance = await getCashBalance(participantClient1)
		const expectedDaiBalance = originalDaiBalance - amountInDai
		assert.strictEqual(daiBalance, expectedDaiBalance, `Dai not sent as expected. Balance: ${daiBalance}. Expected: ${expectedDaiBalance}`)

		// Exit Position
		const setsToSell = shareBalances[0] - 4n
		const noNeededForSwap = await expectedSharesNeededForSwap(participantClient1, false, setsToSell)
		const noSharesNeeded = setsToSell + noNeededForSwap
		const expectedDaiFromShares = setsToSell * numTicks
		await setERC1155Approval(participantClient1, shareTokenAddress, router, true)

		// Deadline check works
		assert.rejects(exitPosition(participantClient1, expectedDaiFromShares, noSharesNeeded, 0n))

		// maxSharesSwapped check works
		assert.rejects(exitPosition(participantClient1, expectedDaiFromShares, noSharesNeeded - 1n))

		await exitPosition(participantClient1, expectedDaiFromShares)

		const reportingFee = await getReportingFee(participantClient1)
		const daiBalanceAfterExit = await getCashBalance(participantClient1)
		const expectedDaiFromSharesAfterReportingFee = expectedDaiFromShares - (expectedDaiFromShares / reportingFee)
		const expectedDaiBalanceAfterExit = expectedDaiBalance + expectedDaiFromSharesAfterReportingFee
		assert.strictEqual(daiBalanceAfterExit, expectedDaiBalanceAfterExit, `Dai not recieved as expected. Balance ${daiBalanceAfterExit}. Expected: ${expectedDaiBalanceAfterExit}`)

		const shareBalancesAfterExit = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalancesAfterExit[0], 4n, `Did not close out Invalid position when exiting Yes position`)
		assert.strictEqual(shareBalancesAfterExit[1], 0n, `Did not close out No position when exiting No position`)
		assert.strictEqual(shareBalancesAfterExit[2], 0n, `Recieved Yes shares when exiting a No position`)
	})

	test('canEstimateExactShares', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const participantClient1 = createWriteClient(mockWindow, TEST_ADDRESSES[1], 0)
		await deployAugurConstantProductMarket(client)

		const setsToBuy = 10000000n
		await approveCash(client)
		await approveCash(participantClient1)
		const router = await getAugurConstantProductMarketRouterAddress()
		const shareTokenAddress = addressString(SHARE_TOKEN)
		await setERC1155Approval(client, shareTokenAddress, router, true)
		await setERC1155Approval(participantClient1, shareTokenAddress, router, true)

		await mintLiquidity(client, setsToBuy, UNIV4_MIN_TICK, UNIV4_MAX_TICK, setsToBuy, setsToBuy, YEAR_2030)

		// Get estimate for exact shares
		const desiredShares = 100000n
		const maxDaiIn = desiredShares * numTicks
		const estimateResults = await getExactShareEnterEstimate(participantClient1, desiredShares, true, maxDaiIn)

		// Enter position using provided results
		const amountInDai = estimateResults[0] * numTicks
		await enterPosition(participantClient1, amountInDai, true)

		const shareBalances = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalances[0], estimateResults[0], `Did not receive expected Invalid shares when purchasing Yes: Got ${shareBalances[0]}. Expected: ${desiredShares}`)
		assert.strictEqual(shareBalances[1], 0n, `Recieved No shares when purchasing Yes`)
		assert.strictEqual(shareBalances[2], desiredShares, `Did not recieve expected Yes shares when purchasing Yes: Got ${shareBalances[2]}. Expected: ${desiredShares}`)
	})

	test('canSwapNo', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const participantClient1 = createWriteClient(mockWindow, TEST_ADDRESSES[1], 0)
		await deployAugurConstantProductMarket(client)

		const setsToBuy = 10000000n
		await approveCash(client)
		await approveCash(participantClient1)
		const router = await getAugurConstantProductMarketRouterAddress()
		const shareTokenAddress = addressString(SHARE_TOKEN)
		await setERC1155Approval(client, shareTokenAddress, router, true)
		await setERC1155Approval(participantClient1, shareTokenAddress, router, true)

		await mintLiquidity(client, setsToBuy, UNIV4_MIN_TICK, UNIV4_MAX_TICK, setsToBuy, setsToBuy, YEAR_2030)

		// Enter position
		const amountInDai = 50000n
		const baseSharesExpected = amountInDai / numTicks
		const expectedSwapShares = await expectedSharesAfterSwap(participantClient1, true, baseSharesExpected)
		const expectedNoShares = baseSharesExpected + expectedSwapShares

		await enterPosition(participantClient1, amountInDai, false)

		const shareBalances = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalances[0], baseSharesExpected, `Did not receive expected Invalid shares when purchasing No: Got ${shareBalances[0]}. Expected: ${baseSharesExpected}`)
		assert.strictEqual(shareBalances[1], expectedNoShares, `Did not recieve expected No shares when purchasing No: Got ${shareBalances[1]}. Expected: ${expectedNoShares}`)
		assert.strictEqual(shareBalances[2], 0n, `Recieved Yes shares when purchasing No`)

		// Swap to Yes
		const expectedYesShares = await expectedSharesAfterSwap(participantClient1, false, expectedNoShares)

		// Deadline check works
		assert.rejects(swapExactIn(participantClient1, expectedNoShares, false, 0n, 0n))

		// minSharesOut check works
		assert.rejects(swapExactIn(participantClient1, expectedNoShares, false, expectedYesShares + 1n))

		await swapExactIn(participantClient1, expectedNoShares, false)

		const shareBalancesAfterSwap = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalancesAfterSwap[0], baseSharesExpected, `Invalid shares changed during swap`)
		assert.strictEqual(shareBalancesAfterSwap[1], 0n, `Did not lose No shares when swapping No for Yes`)
		assert.strictEqual(shareBalancesAfterSwap[2], expectedYesShares, `Did not recieve expected Yes shares when swapping No for Yes: Got ${shareBalancesAfterSwap[2]}. Expected: ${expectedYesShares}`)
	})

	test('canGetSwapSplitEstimate', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const participantClient1 = createWriteClient(mockWindow, TEST_ADDRESSES[1], 0)
		await deployAugurConstantProductMarket(client)

		const setsToBuy = 10000000n
		await approveCash(client)
		await approveCash(participantClient1)
		const router = await getAugurConstantProductMarketRouterAddress()
		const shareTokenAddress = addressString(SHARE_TOKEN)
		await setERC1155Approval(client, shareTokenAddress, router, true)
		await setERC1155Approval(participantClient1, shareTokenAddress, router, true)

		await mintLiquidity(client, setsToBuy, UNIV4_MIN_TICK, UNIV4_MAX_TICK, setsToBuy, setsToBuy, YEAR_2030)

		// Enter position
		const amountInDai = 50000n
		const baseSharesExpected = amountInDai / numTicks
		const expectedSwapShares = await expectedSharesAfterSwap(participantClient1, true, baseSharesExpected)
		const expectedNoShares = baseSharesExpected + expectedSwapShares

		await enterPosition(participantClient1, amountInDai, false)

		const shareBalances = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalances[0], baseSharesExpected, `Did not receive expected Invalid shares when purchasing No: Got ${shareBalances[0]}. Expected: ${baseSharesExpected}`)
		assert.strictEqual(shareBalances[1], expectedNoShares, `Did not recieve expected No shares when purchasing No: Got ${shareBalances[1]}. Expected: ${expectedNoShares}`)
		assert.strictEqual(shareBalances[2], 0n, `Recieved Yes shares when purchasing No`)

		// Swap to Yes
		const shareSplitResults = await getShareSplit(participantClient1, expectedNoShares, false)

		await swapExactIn(participantClient1, shareSplitResults[1], false)

		const shareBalancesAfterSwap = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalancesAfterSwap[1], shareSplitResults[0], `Split did not give expected No shares`)
		assert.strictEqual(shareBalancesAfterSwap[2], shareSplitResults[0], `Split did not give expected Yes shares`)
	})

	test('canSwapYes', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const participantClient1 = createWriteClient(mockWindow, TEST_ADDRESSES[1], 0)
		await deployAugurConstantProductMarket(client)

		const setsToBuy = 10000000n
		await approveCash(client)
		await approveCash(participantClient1)
		const router = await getAugurConstantProductMarketRouterAddress()
		const shareTokenAddress = addressString(SHARE_TOKEN)
		await setERC1155Approval(client, shareTokenAddress, router, true)
		await setERC1155Approval(participantClient1, shareTokenAddress, router, true)

		await mintLiquidity(client, setsToBuy, UNIV4_MIN_TICK, UNIV4_MAX_TICK, setsToBuy, setsToBuy, YEAR_2030)

		// Enter position
		const amountInDai = 50000n
		const baseSharesExpected = amountInDai / numTicks
		const expectedSwapShares = await expectedSharesAfterSwap(participantClient1, false, baseSharesExpected)
		const expectedYesShares = baseSharesExpected + expectedSwapShares

		await enterPosition(participantClient1, amountInDai, true)

		const shareBalances = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalances[0], baseSharesExpected, `Did not receive expected Invalid shares when purchasing No: Got ${shareBalances[0]}. Expected: ${baseSharesExpected}`)
		assert.strictEqual(shareBalances[1], 0n, `Recieved No shares when purchasing Yes`)
		assert.strictEqual(shareBalances[2], expectedYesShares, `Did not recieve expected No shares when purchasing No: Got ${shareBalances[2]}. Expected: ${expectedYesShares}`)

		// Swap to Yes
		const expectedNoShares = await expectedSharesAfterSwap(participantClient1, true, expectedYesShares)

		// Deadline check works
		assert.rejects(swapExactIn(participantClient1, expectedYesShares, true, 0n, 0n))

		// minSharesOut check works
		assert.rejects(swapExactIn(participantClient1, expectedYesShares, true, expectedNoShares + 1n))

		await swapExactIn(participantClient1, expectedYesShares, true)

		const shareBalancesAfterSwap = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalancesAfterSwap[0], baseSharesExpected, `Invalid shares changed during swap`)
		assert.strictEqual(shareBalancesAfterSwap[1], expectedNoShares, `Did not recieve expected No shares when swapping Yes for No: Got ${shareBalancesAfterSwap[1]}. Expected: ${expectedNoShares}`)
		assert.strictEqual(shareBalancesAfterSwap[2], 0n, `Did not lose Yes shares when swapping Yes for No`)
	})

	test('canSwapForExact', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const participantClient1 = createWriteClient(mockWindow, TEST_ADDRESSES[1], 0)
		await deployAugurConstantProductMarket(client)

		const setsToBuy = 10000000n
		await approveCash(client)
		await approveCash(participantClient1)
		const router = await getAugurConstantProductMarketRouterAddress()
		const shareTokenAddress = addressString(SHARE_TOKEN)
		await setERC1155Approval(client, shareTokenAddress, router, true)
		await setERC1155Approval(participantClient1, shareTokenAddress, router, true)

		await mintLiquidity(client, setsToBuy, UNIV4_MIN_TICK, UNIV4_MAX_TICK, setsToBuy, setsToBuy, YEAR_2030)

		// Enter position
		const amountInDai = 50000n
		const baseSharesExpected = amountInDai / numTicks
		const expectedSwapShares = await expectedSharesAfterSwap(participantClient1, false, baseSharesExpected)
		const expectedYesShares = baseSharesExpected + expectedSwapShares

		await enterPosition(participantClient1, amountInDai, true)

		const shareBalances = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalances[0], baseSharesExpected, `Did not receive expected Invalid shares when purchasing No: Got ${shareBalances[0]}. Expected: ${baseSharesExpected}`)
		assert.strictEqual(shareBalances[1], 0n, `Recieved No shares when purchasing Yes`)
		assert.strictEqual(shareBalances[2], expectedYesShares, `Did not recieve expected No shares when purchasing No: Got ${shareBalances[2]}. Expected: ${expectedYesShares}`)

		// Swap Yes to No
		const expectedNoShares = await expectedSharesAfterSwap(participantClient1, true, expectedYesShares)

		// Deadline check works
		assert.rejects(swapExactOut(participantClient1, expectedNoShares, true, expectedYesShares, 0n))

		// maxSharesIn check works
		assert.rejects(swapExactOut(participantClient1, expectedNoShares, true, expectedYesShares - 1n))

		await swapExactOut(participantClient1, expectedNoShares, true)

		const shareBalancesAfterSwap = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalancesAfterSwap[0], baseSharesExpected, `Invalid shares changed during swap`)
		assert.strictEqual(shareBalancesAfterSwap[1], expectedNoShares, `Did not recieve expected No shares when swapping Yes for No: Got ${shareBalances[1]}. Expected: ${expectedNoShares}`)
		assert.strictEqual(shareBalancesAfterSwap[2], 0n, `Did not lose Yes shares when swapping Yes for No`)

		// Swap No to Yes
		const expectedYesShares2 = await expectedSharesAfterSwap(participantClient1, false, expectedNoShares)
		await swapExactOut(participantClient1, expectedYesShares2, false)

		const shareBalancesAfterSwap2 = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalancesAfterSwap2[0], baseSharesExpected, `Invalid shares changed during swap`)
		assert.strictEqual(shareBalancesAfterSwap2[1], 0n, `DId not use No shares in swap`)
		assert.strictEqual(shareBalancesAfterSwap2[2], expectedYesShares2, `Did not receive expected Yes shares swapping NO`)
	})

	test('canSupportMultipleParties', async () => {
		const liquidityProviderClient1 = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const liquidityProviderClient2 = createWriteClient(mockWindow, TEST_ADDRESSES[1], 0)
		const participantClient1 = createWriteClient(mockWindow, TEST_ADDRESSES[2], 0)
		const participantClient2 = createWriteClient(mockWindow, TEST_ADDRESSES[3], 0)

		await deployAugurConstantProductMarket(liquidityProviderClient1)

		await approveCash(liquidityProviderClient1)
		await approveCash(liquidityProviderClient2)
		await approveCash(participantClient1)
		await approveCash(participantClient2)

		const router = await getAugurConstantProductMarketRouterAddress()
		const shareTokenAddress = addressString(SHARE_TOKEN)
		await setERC1155Approval(liquidityProviderClient1, shareTokenAddress, router, true)
		await setERC1155Approval(liquidityProviderClient2, shareTokenAddress, router, true)
		await setERC1155Approval(participantClient1, shareTokenAddress, router, true)
		await setERC1155Approval(participantClient2, shareTokenAddress, router, true)
		await setERC1155Approval(liquidityProviderClient1, addressString(UNIV4_POSITION_MANAGER), router, true);
		await setERC1155Approval(liquidityProviderClient2, addressString(UNIV4_POSITION_MANAGER), router, true);

		// First LP
		const setsToBuy = 10000000n
		const positionTokenId1 = await getNextPositionManagerToken(liquidityProviderClient1)
		await mintLiquidity(liquidityProviderClient1, setsToBuy, UNIV4_MIN_TICK, UNIV4_MAX_TICK, setsToBuy, setsToBuy, YEAR_2030)

		// Second LP
		const positionTokenId2 = await getNextPositionManagerToken(liquidityProviderClient2)
		await mintLiquidity(liquidityProviderClient2, setsToBuy, UNIV4_MIN_TICK, UNIV4_MAX_TICK, setsToBuy, setsToBuy, YEAR_2030)

		const lpBalance1 = await getPoolLiquidityBalance(liquidityProviderClient1, positionTokenId1)
		const lpBalance2 = await getPoolLiquidityBalance(liquidityProviderClient2, positionTokenId2)
		const lpDaiBalance1 = await getCashBalance(liquidityProviderClient1)
		const lpDaiBalance2 = await getCashBalance(liquidityProviderClient2)

		const lp1TokenIds = await getLpTokens(liquidityProviderClient1)
		assert.deepEqual(lp1TokenIds, [positionTokenId1])

		const lp2TokenIds = await getLpTokens(liquidityProviderClient2)
		assert.deepEqual(lp2TokenIds, [positionTokenId2])

		// participant 1 enters Yes
		const amountInDai = 50000n
		const baseYesSharesExpected = amountInDai / numTicks
		const expectedYesSwapShares = await expectedSharesAfterSwap(participantClient1, false, baseYesSharesExpected)
		const expectedYesShares = baseYesSharesExpected + expectedYesSwapShares
		await enterPosition(participantClient1, amountInDai, true)

		const shareBalancesAfterEnterYes = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalancesAfterEnterYes[0], baseYesSharesExpected, `Did not receive expected Invalid shares when purchasing No: Got ${shareBalancesAfterEnterYes[0]}. Expected: ${baseYesSharesExpected}`)
		assert.strictEqual(shareBalancesAfterEnterYes[1], 0n, `Recieved Yes shares when purchasing No`)
		assert.strictEqual(shareBalancesAfterEnterYes[2], expectedYesShares, `Did not recieve expected Yes shares when purchasing Yes: Got ${shareBalancesAfterEnterYes[2]}. Expected: ${expectedYesShares}`)

		// participant 2 enters No
		const baseNoSharesExpected = amountInDai / numTicks
		const expectedNoSwapShares = await expectedSharesAfterSwap(participantClient2, true, baseNoSharesExpected)
		const expectedNoShares = baseNoSharesExpected + expectedNoSwapShares
		await enterPosition(participantClient2, amountInDai, false)

		const shareBalancesAfterEnterNo = await getShareBalances(participantClient2, participantClient2.account.address)
		assert.strictEqual(shareBalancesAfterEnterNo[0], baseNoSharesExpected, `Did not receive expected Invalid shares when purchasing No: Got ${shareBalancesAfterEnterNo[0]}. Expected: ${baseNoSharesExpected}`)
		assert.strictEqual(shareBalancesAfterEnterNo[1], expectedNoShares, `Did not recieve expected No shares when purchasing No: Got ${shareBalancesAfterEnterNo[1]}. Expected: ${expectedNoShares}`)
		assert.strictEqual(shareBalancesAfterEnterNo[2], 0n, `Recieved Yes shares when purchasing No`)

		// Second LP removes partial liquidity
		const partialLiquidityRemovalAmount = lpBalance2 / 10n
		const expectedMinSharesReturned = (setsToBuy / 10n) - 1n;
		const expectedLiquidityAfterRemoval = lpBalance2 - partialLiquidityRemovalAmount
		await decreaseLiquidity(liquidityProviderClient2, positionTokenId2, partialLiquidityRemovalAmount, expectedMinSharesReturned, expectedMinSharesReturned, YEAR_2030)
		const newLPBalance = await getPoolLiquidityBalance(liquidityProviderClient2, positionTokenId2)
		assert.strictEqual(newLPBalance, expectedLiquidityAfterRemoval, `Liquidity not removed correctly`)

		const reportingFee = await getReportingFee(liquidityProviderClient2)
		const daiBalanceAfterPartialRemoval = await getCashBalance(liquidityProviderClient2)
		const setsSold = expectedMinSharesReturned + 1n
		const expectedBaseReturn = setsSold * numTicks
		const expectedReturnAfterFee = expectedBaseReturn - (expectedBaseReturn / reportingFee)
		const expectedDaiBalanceAfterPartialRemoval = lpDaiBalance2 + expectedReturnAfterFee
		assert.strictEqual(daiBalanceAfterPartialRemoval, expectedDaiBalanceAfterPartialRemoval, `Dai not returned as expected. Got ${daiBalanceAfterPartialRemoval}. Expected: ${expectedDaiBalanceAfterPartialRemoval}`)

		const shareBalances = await getShareBalances(liquidityProviderClient2, liquidityProviderClient2.account.address)
		assert.strictEqual(shareBalances[0], setsToBuy - setsSold, `User did not lose Invalid shares when removing partial liquidity`)
		assert.strictEqual(shareBalances[1], 0n, `User received No shares incorrectly`)
		assert.strictEqual(shareBalances[2], 0n, `User received Yes shares incorrectly`)

		// Participant 1 Swaps partially to No
		const amountToSwapToNo = expectedYesShares / 2n
		const expectedNoSharesAfterPartialSwap = await expectedSharesAfterSwap(participantClient1, true, amountToSwapToNo)
		await swapExactIn(participantClient1, amountToSwapToNo, true)

		const shareBalancesAfterSwap = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalancesAfterSwap[0], baseYesSharesExpected, `Invalid shares changed during swap`)
		assert.strictEqual(shareBalancesAfterSwap[1], expectedNoSharesAfterPartialSwap, `Did not recieve expected No shares when swapping Yes for No: Got ${shareBalancesAfterSwap[1]}. Expected: ${expectedNoSharesAfterPartialSwap}`)
		assert.strictEqual(shareBalancesAfterSwap[2], expectedYesShares - amountToSwapToNo, `Did not lose Yes shares when swapping Yes for No`)

		// Participant 2 swaps entirely to Yes
		const amountToSwapToYes = expectedNoShares
		const expectedYesSharesAfterTotalSwap = await expectedSharesAfterSwap(participantClient2, false, amountToSwapToYes)
		await swapExactIn(participantClient2, amountToSwapToYes, false)

		const shareBalancesAfterSecondSwap = await getShareBalances(participantClient2, participantClient2.account.address)
		assert.strictEqual(shareBalancesAfterSecondSwap[0], baseYesSharesExpected, `Invalid shares changed during swap`)
		assert.strictEqual(shareBalancesAfterSecondSwap[1], expectedNoShares - amountToSwapToYes, `Did not lose No shares when swapping No for Yes`)
		assert.strictEqual(shareBalancesAfterSecondSwap[2], expectedYesSharesAfterTotalSwap, `Did not recieve expected Yes shares when swapping No for Yes: Got ${shareBalancesAfterSecondSwap[1]}. Expected: ${expectedYesSharesAfterTotalSwap}`)

		// Participant 1 partially exits position
		const daiBalanceBeforePartialExit = await getCashBalance(participantClient1)
		const shareBalancesBeforePartialExit = await getShareBalances(participantClient1, participantClient1.account.address)
		const exitAmountInShares = shareBalancesBeforePartialExit[1]
		const amountInDaiForExit = exitAmountInShares * numTicks
		const expectedInvalidSharesAfterPartialExit = shareBalancesBeforePartialExit[0] - exitAmountInShares
		const expectedYesSharesAfterPartialExit = shareBalancesBeforePartialExit[2] - exitAmountInShares
		await exitPosition(participantClient1, amountInDaiForExit)

		const daiBalanceAfterExit = await getCashBalance(participantClient1)
		const amountInDaiForExitAfterReportingFee = amountInDaiForExit - (amountInDaiForExit / reportingFee)
		const expectedDaiBalanceAfterExit = daiBalanceBeforePartialExit + amountInDaiForExitAfterReportingFee
		assert.strictEqual(daiBalanceAfterExit, expectedDaiBalanceAfterExit, `Dai not recieved as expected. Balance ${daiBalanceAfterExit}. Expected: ${expectedDaiBalanceAfterExit}`)

		const shareBalancesAfterExit = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalancesAfterExit[0], expectedInvalidSharesAfterPartialExit, `Invalid shares after close out not as expected`)
		assert.strictEqual(shareBalancesAfterExit[1], 0n, `Did not close out No shares when exiting No position entirely`)
		assert.strictEqual(shareBalancesAfterExit[2], expectedYesSharesAfterPartialExit, `Yes shares after close out not as expected`)

		// First LP removes all liquidity
		const marketSharesBalances = await getShareBalances(liquidityProviderClient1, addressString(UNIV4_POOL_MANAGER))
		const noShare = (marketSharesBalances[1] * lpBalance1 / (lpBalance1 + newLPBalance)) - 5n
		const yesShare = (marketSharesBalances[2] * lpBalance1 / (lpBalance1 + newLPBalance)) - 4n
		const expectedSetsSold = yesShare + 3n
		await burnLiquidity(liquidityProviderClient1, positionTokenId1, noShare, yesShare, YEAR_2030)
		const daiBalanceAfterLPBurn1 = await getCashBalance(liquidityProviderClient1)
		const expectedDaiFromBurn = expectedSetsSold * numTicks
		const expectedDaiBalanceAfterBurn1 = lpDaiBalance1 + expectedDaiFromBurn - (expectedDaiFromBurn / reportingFee)
		assert.strictEqual(daiBalanceAfterLPBurn1, expectedDaiBalanceAfterBurn1, `Dai not returned as expected. Got ${daiBalanceAfterLPBurn1}. Expected: ${expectedDaiBalanceAfterBurn1}`)

		const finalShareBalancesAfterLpBurn1 = await getShareBalances(liquidityProviderClient1, liquidityProviderClient1.account.address)
		assert.strictEqual(finalShareBalancesAfterLpBurn1[0], 22n, `User received excess Invalid shares incorrectly`)
		assert.strictEqual(finalShareBalancesAfterLpBurn1[1], 50n, `User received excess No shares incorrectly`)
		assert.strictEqual(finalShareBalancesAfterLpBurn1[2], 0n, `User received Yes shares incorrectly`)

		// Participant 2 exits position
		const daiBalanceBeforePartialExit2 = await getCashBalance(participantClient2)
		const shareBalancesBeforePartialExit2 = await getShareBalances(participantClient2, participantClient2.account.address)
		const exitAmountInShares2 = shareBalancesBeforePartialExit2[2] / 4n
		const amountInDaiForExit2 = exitAmountInShares2 * numTicks
		const expectedInvalidSharesAfterPartialExit2 = shareBalancesBeforePartialExit2[0] - exitAmountInShares2
		await exitPosition(participantClient2, amountInDaiForExit2)

		const daiBalanceAfterPartialExit2 = await getCashBalance(participantClient2)
		const amountInDaiForExitAfterReportingFee2 = amountInDaiForExit2 - (amountInDaiForExit2 / reportingFee)
		const expectedDaiBalanceAfterPartialExit2 = daiBalanceBeforePartialExit2 + amountInDaiForExitAfterReportingFee2
		assert.strictEqual(daiBalanceAfterPartialExit2, expectedDaiBalanceAfterPartialExit2, `Dai not recieved as expected. Balance ${daiBalanceAfterPartialExit2}. Expected: ${expectedDaiBalanceAfterPartialExit2}`)

		const shareBalancesAfterPartialExit2 = await getShareBalances(participantClient2, participantClient2.account.address)
		assert.strictEqual(shareBalancesAfterPartialExit2[0], expectedInvalidSharesAfterPartialExit2, `Did not close out Invalid position when exiting position`)
		assert.strictEqual(shareBalancesAfterPartialExit2[1], 0n, `Did not close out No shares when exiting position`)
		assert.strictEqual(shareBalancesAfterPartialExit2[2], 44n, `Did not close out Yes position when exiting position`)

		// Second LP removes all remaining liquidity
		const marketSharesBalances2 = await getShareBalances(liquidityProviderClient1, addressString(UNIV4_POOL_MANAGER))
		const noShare2 = marketSharesBalances2[1] - 10n // min out does not account for fees
 		const yesShare2 = marketSharesBalances2[2] - 10n
		const expectedSetsSold2 = yesShare2 + 2n
		await burnLiquidity(liquidityProviderClient2, positionTokenId2, noShare2, yesShare2, YEAR_2030)
		const daiBalance = await getCashBalance(liquidityProviderClient2)
		const expectedDaiFromBurn2 = expectedSetsSold2 * numTicks
		const expectedDaiBalance = daiBalanceAfterPartialRemoval + expectedDaiFromBurn2 - (expectedDaiFromBurn2 / reportingFee)
		assert.strictEqual(daiBalance, expectedDaiBalance, `Dai not returned as expected. Got ${daiBalance}. Expected: ${expectedDaiBalance}`)

		const finalShareBalances = await getShareBalances(liquidityProviderClient2, liquidityProviderClient2.account.address)
		assert.strictEqual(finalShareBalances[0], 0n, `User received excess Invalid shares incorrectly`)
		assert.strictEqual(finalShareBalances[1], 1n, `User received excess No shares incorrectly`)
		assert.strictEqual(finalShareBalances[2], 3n, `User received Yes shares incorrectly`)
	})

	test('canOnlyWithdrawProfitUpToInitialEntry', async () => {
		const liquidityProviderClient = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const participantClient1 = createWriteClient(mockWindow, TEST_ADDRESSES[2], 0)
		const participantClient2 = createWriteClient(mockWindow, TEST_ADDRESSES[3], 0)

		await deployAugurConstantProductMarket(liquidityProviderClient)

		await approveCash(liquidityProviderClient)
		await approveCash(participantClient1)
		await approveCash(participantClient2)

		const shareTokenAddress = addressString(SHARE_TOKEN)
		const router = await getAugurConstantProductMarketRouterAddress()
		await setERC1155Approval(liquidityProviderClient, shareTokenAddress, router, true)
		await setERC1155Approval(participantClient1, shareTokenAddress, router, true)

		// Provide Liquidity
		const setsToBuy = 1000000n
		await mintLiquidity(liquidityProviderClient, setsToBuy, UNIV4_MIN_TICK, UNIV4_MAX_TICK, setsToBuy, setsToBuy, YEAR_2030)

		// participant 1 enters Yes
		const amountInDai = 1000000n
		await enterPosition(participantClient1, amountInDai, true)

		// participant 2 enters Yes with much higher amount
		await enterPosition(participantClient2, amountInDai * 1000n, true)

		// Participant 1 can only exit up to amountInDai
		const tooHighExitAmountInDai = amountInDai + 1000n;
		assert.rejects(exitPosition(participantClient1, tooHighExitAmountInDai))

		await exitPosition(participantClient1, amountInDai)
	})

	const canSwapEnterAndExitTestCases = [
		{ position1Size: 50000000n, position2Size: 50000000n, yes: true},
		{ position1Size: 50000000n, position2Size: 50000000n, yes: false},
		{ position1Size: 50000000n, position2Size: 9000000000n, yes: true},
		{ position1Size: 50000000n, position2Size: 9000000000n, yes: false},
		{ position1Size: 50000000n, position2Size: 9900000000n, yes: true},
		{ position1Size: 50000000n, position2Size: 9900000000n, yes: false},
		{ position1Size: 9000000000n, position2Size: 50000000n, yes: true},
		{ position1Size: 9000000000n, position2Size: 50000000n, yes: false},
	]

	test('canSwapEnterAndExit', async (t) => {
		for (const testCase of canSwapEnterAndExitTestCases) {
			await t.test(`Test Case: Buying ${testCase.position1Size} ${testCase.yes? "YES" : "NO"}. Opposition buys ${testCase.position2Size}`, async () => {
				const liquidityProviderClient = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
				const participantClient1 = createWriteClient(mockWindow, TEST_ADDRESSES[1], 0)
				const participantClient2 = createWriteClient(mockWindow, TEST_ADDRESSES[2], 0)
				await deployAugurConstantProductMarket(liquidityProviderClient)
				const shareTokenAddress = addressString(SHARE_TOKEN)
				const router = await getAugurConstantProductMarketRouterAddress()

				const setsToBuy = 10000000n
				await approveCash(liquidityProviderClient)
				await approveCash(participantClient1)
				await approveCash(participantClient2)
				await setERC1155Approval(liquidityProviderClient, shareTokenAddress, router, true)
				await setERC1155Approval(participantClient1, shareTokenAddress, router, true)
				await setERC1155Approval(participantClient2, shareTokenAddress, router, true)

				await mintLiquidity(liquidityProviderClient, setsToBuy, UNIV4_MIN_TICK, UNIV4_MAX_TICK, setsToBuy, setsToBuy, YEAR_2030)

				// Participant 1 enters position
				const baseSharesExpected1 = testCase.position1Size / numTicks
				const expectedSwapShares1 = await expectedSharesAfterSwap(participantClient1, !testCase.yes, baseSharesExpected1)
				const expectedShares1 = baseSharesExpected1 + expectedSwapShares1
				await enterPosition(participantClient1, testCase.position1Size, testCase.yes)

				const shareBalances1 = await getShareBalances(participantClient1, participantClient1.account.address)
				assert.strictEqual(shareBalances1[0], baseSharesExpected1)
				assert.strictEqual(shareBalances1[1], testCase.yes ? 0n : expectedShares1)
				assert.strictEqual(shareBalances1[2], testCase.yes ? expectedShares1: 0n)

				// Participant 2 enters opposing position
				const baseSharesExpected2 = testCase.position2Size / numTicks
				const expectedSwapShares2 = await expectedSharesAfterSwap(participantClient2, testCase.yes, baseSharesExpected2)
				const expectedShares2 = baseSharesExpected2 + expectedSwapShares2
				await enterPosition(participantClient2, testCase.position2Size, !testCase.yes)

				const shareBalances2 = await getShareBalances(participantClient2, participantClient2.account.address)
				assert.strictEqual(shareBalances2[0], baseSharesExpected2)
				assert.strictEqual(shareBalances2[1], testCase.yes ? expectedShares2 : 0n)
				assert.strictEqual(shareBalances2[2], testCase.yes ? 0n : expectedShares2)

				// Participant 1 swaps to opposing position
				const expectedNoSharesAfterSwap = await expectedSharesAfterSwap(participantClient1, testCase.yes, expectedShares1)
				await swapExactIn(participantClient1, expectedShares1, testCase.yes)

				const shareBalancesAfterSwap = await getShareBalances(participantClient1, participantClient1.account.address)
				assert.strictEqual(shareBalancesAfterSwap[0], baseSharesExpected1)
				assert.strictEqual(shareBalancesAfterSwap[1], testCase.yes ? expectedNoSharesAfterSwap : 0n)
				assert.strictEqual(shareBalancesAfterSwap[2], testCase.yes ? 0n : expectedNoSharesAfterSwap)

				// Participant 2 exits position
				const daiBalanceBeforeExit = await getCashBalance(participantClient2)
				const sharesToSell = shareBalances2[0] / 2n
				const expectedDaiFromShares = sharesToSell * numTicks
				const sharesNeededToSwap = await expectedSharesNeededForSwap(participantClient2, !testCase.yes, sharesToSell)
				const expectedInvalidSharesAfterExit = shareBalances2[0] - sharesToSell
				const expectedSharesAfterExit = shareBalances2[testCase.yes ? 1 : 2] - sharesNeededToSwap - sharesToSell
				await exitPosition(participantClient2, expectedDaiFromShares)

				const daiBalanceAfterExit = await getCashBalance(participantClient2)
				const reportingFee = await getReportingFee(participantClient2)
				const expectedDaiFromSharesAfterReportingFee = expectedDaiFromShares - (expectedDaiFromShares / reportingFee)
				const expectedDaiBalanceAfterExit = daiBalanceBeforeExit + expectedDaiFromSharesAfterReportingFee
				assert.strictEqual(daiBalanceAfterExit, expectedDaiBalanceAfterExit)

				const shareBalancesAfterExit = await getShareBalances(participantClient2, participantClient2.account.address)
				assert.strictEqual(shareBalancesAfterExit[0], expectedInvalidSharesAfterExit)
				if (testCase.yes) {
					assert.ok(expectedSharesAfterExit - shareBalancesAfterExit[1] <= 1n)
					assert.strictEqual(shareBalancesAfterExit[2], 0n)
				} else {
					assert.strictEqual(shareBalancesAfterExit[1], 0n)
					assert.ok(expectedSharesAfterExit - shareBalancesAfterExit[2] <= 1n)
				}
			})
		}
	})

	const canRoundTripTestCases = [
		{ positionSize: 50000000n, yes: true},
		{ positionSize: 50000000n, yes: false},
		{ positionSize: 500000000n, yes: true},
		{ positionSize: 500000000n, yes: false},
	]

	test('canRoundTrip', async (t) => {
		for (const testCase of canRoundTripTestCases) {
			await t.test(`Test Case: Round tripping ${testCase.positionSize} ${testCase.yes? "YES" : "NO"}`, async () => {
				const liquidityProviderClient = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
				const participantClient = createWriteClient(mockWindow, TEST_ADDRESSES[1], 0)
				await deployAugurConstantProductMarket(liquidityProviderClient)
				const shareTokenAddress = addressString(SHARE_TOKEN)
				const router = await getAugurConstantProductMarketRouterAddress()

				const setsToBuy = 1000000000n
				await approveCash(liquidityProviderClient)
				await approveCash(participantClient)
				await setERC1155Approval(liquidityProviderClient, shareTokenAddress, router, true)
				await setERC1155Approval(participantClient, shareTokenAddress, router, true)

				await mintLiquidity(liquidityProviderClient, setsToBuy, UNIV4_MIN_TICK, UNIV4_MAX_TICK, setsToBuy, setsToBuy, YEAR_2030)

				// Participant enters position
				const baseSharesExpected = testCase.positionSize / numTicks
				const expectedSwapShares = await expectedSharesAfterSwap(participantClient, !testCase.yes, baseSharesExpected)
				const expectedShares = baseSharesExpected + expectedSwapShares
				await enterPosition(participantClient, testCase.positionSize, testCase.yes)

				const shareBalances = await getShareBalances(participantClient, participantClient.account.address)
				assert.strictEqual(shareBalances[0], baseSharesExpected)
				assert.strictEqual(shareBalances[1], testCase.yes ? 0n : expectedShares)
				assert.strictEqual(shareBalances[2], testCase.yes ? expectedShares : 0n)

				// Participant exits position
				const daiBalanceBeforeExit = await getCashBalance(participantClient)
				const positionShares = shareBalances[testCase.yes ? 2 : 1]
				const sharesToSwap = positionShares - shareBalances[0]
				const opposingSharesDesired = shareBalances[0] // Our position will always be larger than INVALID in this test
				const sharesNeededForSwap = await expectedSharesNeededForSwap(participantClient, testCase.yes, opposingSharesDesired)
				let sharesToSell = shareBalances[0]
				if (sharesNeededForSwap > sharesToSwap) {
					const worstRate = await expectedSharesAfterSwap(participantClient, testCase.yes, positionShares)
					const swapAmount = positionShares**2n / (positionShares + worstRate)
					sharesToSell = positionShares - swapAmount - 1n
				}
				const expectedDaiFromShares = sharesToSell * numTicks
				const expectedInvalidSharesAfterExit = shareBalances[0] - sharesToSell
				await exitPosition(participantClient, expectedDaiFromShares)

				const daiBalanceAfterExit = await getCashBalance(participantClient)
				const reportingFee = await getReportingFee(participantClient)
				const expectedDaiFromSharesAfterReportingFee = expectedDaiFromShares - (expectedDaiFromShares / reportingFee)
				const expectedDaiBalanceAfterExit = daiBalanceBeforeExit + expectedDaiFromSharesAfterReportingFee
				assert.strictEqual(daiBalanceAfterExit, expectedDaiBalanceAfterExit)

				const shareBalancesAfterExit = await getShareBalances(participantClient, participantClient.account.address)
				assert.strictEqual(shareBalancesAfterExit[0], expectedInvalidSharesAfterExit)
				if (testCase.yes) {
					assert.strictEqual(shareBalancesAfterExit[1], 0n)
					assert.ok(shareBalancesAfterExit[2] <= baseSharesExpected / 2000n)
				} else {
					assert.ok(shareBalancesAfterExit[1] <= baseSharesExpected / 2000n)
					assert.strictEqual(shareBalancesAfterExit[2], 0n)
				}
			})
		}
	})

	test('canUseCollectionFunctions', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const market1 = await deployAugurConstantProductMarket(client)
		const market2 = await deployAugurConstantProductMarket(client, true, true)
		const market3 = await deployAugurConstantProductMarket(client, true, true)
		const market4 = await deployAugurConstantProductMarket(client, true, true)
		const market5 = await deployAugurConstantProductMarket(client, true, true)

		// Get num markets
		const numMarkets = await getNumMarkets(client)
		assert.strictEqual(numMarkets, 5n, `Number of markets incorrect`)

		// We can test validity
		const valid = await getMarketIsValid(client, market5)
		assert.ok(valid, "Valid market not viewed as valid")

		const notValid = await getMarketIsValid(client, client.account.address)
		assert.ok(!notValid, "Invalid address thought of as valid market")

		// We can get markets starting at the latest by using a -1 sentinel value for startIndex

		let markets = await getMarkets(client, -1n, 5n)
		assert.deepEqual(markets, [market5, market4, market3, market2, market1], "Incorrect results using sentinel start and full page value")

		markets = await getMarkets(client, -1n, 20n)
		assert.deepEqual(markets.slice(0, 5), [market5, market4, market3, market2, market1], "Incorrect results using sentinel start and excess page value")

		// We can get a single market

		markets = await getMarkets(client, 0n, 1n)
		assert.deepEqual(markets, [market1])

		// We can get 2 markets

		markets = await getMarkets(client, 1n, 2n)
		assert.deepEqual(markets, [market2, market1])

		// We can get a specific number of markets starting at a specfific index

		markets = await getMarkets(client, 3n, 3n)
		assert.deepEqual(markets, [market4, market3, market2])
	})

	test('canUseViewFunctionsWithNoData', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		await deployAugurConstantProductMarket(client)

		// shareBalances
		const shareBalances = await getShareBalances(client, client.account.address)
		assert.strictEqual(shareBalances[0], 0n)
	})

	test('canUseSwapCalculations', async () => {
		const liquidityProviderClient = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const participantClient1 = createWriteClient(mockWindow, TEST_ADDRESSES[1], 0)
		await deployAugurConstantProductMarket(liquidityProviderClient)
		const shareTokenAddress = addressString(SHARE_TOKEN)
		const router = await getAugurConstantProductMarketRouterAddress()

		const setsToBuy = 100000000n
		await approveCash(liquidityProviderClient)
		await approveCash(participantClient1)
		await setERC1155Approval(liquidityProviderClient, shareTokenAddress, router, true)
		await setERC1155Approval(participantClient1, shareTokenAddress, router, true)
		await mintLiquidity(liquidityProviderClient, setsToBuy, UNIV4_MIN_TICK, UNIV4_MAX_TICK, setsToBuy, setsToBuy, YEAR_2030)

		const sharesDesired = setsToBuy / 10n;
		const sharesNeededToSwap = await expectedSharesNeededForSwap(participantClient1, true, sharesDesired)
		const expectedSharesRecieved = await expectedSharesAfterSwap(participantClient1, true, sharesNeededToSwap)
		const delta = expectedSharesRecieved - sharesNeededToSwap
		assert.ok(delta <= 1n)
	})
})
