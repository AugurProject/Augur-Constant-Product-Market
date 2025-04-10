import { describe, beforeEach, test } from 'node:test'
import { getMockedEthSimulateWindowEthereum, MockWindowEthereum } from '../testsuite/simulator/MockWindowEthereum.js'
import { createWriteClient } from '../testsuite/simulator/utils/viem.js'
import { TEST_ADDRESSES } from '../testsuite/simulator/utils/constants.js'
import { deployAugurConstantProductMarketContract, isAugurConstantProductMarketDeployed, approveCash, getCashAllowance, addLiquidity, getPoolLiquidityBalance, removeLiquidity, getCashBalance, getReportingFee, getShareBalances, enterPosition, getAugurConstantProductMarketAddress, expectedSharesAfterSwap, exitPosition, getShareToken, setERC1155Approval, swap, getPoolSupply, getNoYesShareBalances, setupTestAccounts, getACPMName, getMarketAddress, getACPMSymbol, expectedSharesNeededForSwap, getAugurConstantProductMarketRouterAddress, approveToken, swapForExact } from '../testsuite/simulator/utils/utilities.js'
import assert from 'node:assert'

const numTicks = 1000n

describe('Contract Test Suite', () => {

	let mockWindow: MockWindowEthereum

	beforeEach(async () => {
		mockWindow = getMockedEthSimulateWindowEthereum()
		await setupTestAccounts(mockWindow)
	})

	test('canDeployContractAndCannotDupe', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		await deployAugurConstantProductMarketContract(client)
		const isDeployed = await isAugurConstantProductMarketDeployed(client)
		assert.ok(isDeployed, `Not Deployed!`)

		// Has expected name and symbol
		const marketAddress = getMarketAddress()
		const acpmName = await getACPMName(client)
		const acpmSymbol = await getACPMSymbol(client)
		assert.equal(acpmName, `ACPM-${marketAddress.toLowerCase()}`)
		assert.equal(acpmSymbol, marketAddress.toLowerCase())

		// Another ACPM cannot be deployed for the same market
		assert.rejects(deployAugurConstantProductMarketContract(client, true), `New ACPM was created for the same market`)
	})

	test('canAddAndRemoveLiquidity', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		await deployAugurConstantProductMarketContract(client)

		// Approve Dai for ACPM

		await approveCash(client)
		const allowance = await getCashAllowance(client)
		assert.notEqual(allowance, 0n, `Approve failed`)

		// Approve Share Token

		const router = await getAugurConstantProductMarketRouterAddress()
		const shareTokenAddress = await getShareToken(client)
		await setERC1155Approval(client, shareTokenAddress, router, true)

		const originalDaiBalance = await getCashBalance(client)

		const lpToBuy = 10000000n
		const expectedCost = lpToBuy * numTicks

		// Provide Liquidity
		await addLiquidity(client, lpToBuy)
		const lpBalance = await getPoolLiquidityBalance(client)
		assert.strictEqual(lpBalance, lpToBuy, `Liquidity not bought correctly`)
		const daiBalanceAfterBuy = await getCashBalance(client)
		assert.strictEqual(originalDaiBalance - daiBalanceAfterBuy, expectedCost, `Dai not removed as expected. Costed ${originalDaiBalance - daiBalanceAfterBuy}. Expected: ${expectedCost}`)

		const acpmAddress = await getAugurConstantProductMarketAddress(client)
		const acpmShareBalances = await getShareBalances(client, acpmAddress)
		assert.strictEqual(acpmShareBalances[0], 0n, `ACPM incorrectly recieved Invalid shares`)
		assert.strictEqual(acpmShareBalances[1], lpToBuy, `ACPM did not get expected No shares. Got: ${acpmShareBalances[1]}. Expected: ${lpToBuy}`)
		assert.strictEqual(acpmShareBalances[2], lpToBuy, `ACPM did not get expected Yes shares. Got: ${acpmShareBalances[2]}. Expected: ${lpToBuy}`)

		const liquidityProviderShareBalances = await getShareBalances(client, client.account.address)
		assert.strictEqual(liquidityProviderShareBalances[0], lpToBuy, `Liquidity provider did not receive Invalid shares`)

		// Remove Partial Liquidity (10%)
		await approveToken(client, acpmAddress, router)
		const partialLiquidityRemovalAmount = lpToBuy / 10n
		const expectedLiquidityAfterRemoval = lpToBuy - partialLiquidityRemovalAmount
		await removeLiquidity(client, partialLiquidityRemovalAmount)
		const newLPBalance = await getPoolLiquidityBalance(client)
		assert.strictEqual(newLPBalance, expectedLiquidityAfterRemoval, `Liquidity not removed correctly`)

		const reportingFee = await getReportingFee(client)
		const daiBalanceAfterPartialRemoval = await getCashBalance(client)
		const expectedBaseReturn = partialLiquidityRemovalAmount * numTicks
		const expectedReturnAfterFee = expectedBaseReturn - (expectedBaseReturn / reportingFee)
		const expectedDaiBalanceAfterPartialRemoval = daiBalanceAfterBuy + expectedReturnAfterFee
		assert.strictEqual(daiBalanceAfterPartialRemoval, expectedDaiBalanceAfterPartialRemoval, `Dai not returned as expected. Got ${daiBalanceAfterPartialRemoval}. Expected: ${expectedDaiBalanceAfterPartialRemoval}`)

		const shareBalances = await getShareBalances(client, client.account.address)
		assert.strictEqual(shareBalances[0], lpToBuy - partialLiquidityRemovalAmount, `User did not lose Invalid shares when removing partial liquidity`)
		assert.strictEqual(shareBalances[1], 0n, `User received No shares incorrectly`)
		assert.strictEqual(shareBalances[2], 0n, `User received Yes shares incorrectly`)

		// Remove all Liquidity

		await removeLiquidity(client, expectedLiquidityAfterRemoval)
		const daiBalance = await getCashBalance(client)
		const expectedDaiBalance = originalDaiBalance - (expectedCost / reportingFee)
		assert.strictEqual(daiBalance, expectedDaiBalance, `Dai not returned as expected. Got ${daiBalance}. Expected: ${expectedDaiBalance}`)

		const finalShareBalances = await getShareBalances(client, client.account.address)
		assert.strictEqual(finalShareBalances[0], 0n, `User received Invalid shares incorrectly`)
		assert.strictEqual(finalShareBalances[1], 0n, `User received No shares incorrectly`)
		assert.strictEqual(finalShareBalances[2], 0n, `User received Yes shares incorrectly`)
	})

	test('canEnterAndExitYesPosition', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const participantClient1 = createWriteClient(mockWindow, TEST_ADDRESSES[1], 0)
		await deployAugurConstantProductMarketContract(client)
		const acpmAddress = await getAugurConstantProductMarketAddress(client)

		const lpToBuy = 10000000n
		await approveCash(client)
		await approveCash(participantClient1)
		const router = await getAugurConstantProductMarketRouterAddress()
		const shareTokenAddress = await getShareToken(client)
		await setERC1155Approval(client, shareTokenAddress, router, true)
		await setERC1155Approval(participantClient1, shareTokenAddress, router, true)

		await addLiquidity(client, lpToBuy)

		const originalDaiBalance = await getCashBalance(participantClient1)

		// Enter position
		const amountInDai = 50000n
		const baseSharesExpected = amountInDai / numTicks
		const expectedSwapShares = await expectedSharesAfterSwap(participantClient1, baseSharesExpected, false)
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
		const setsToSell = shareBalances[0] - 3n
		const yesNeededForSwap = await expectedSharesNeededForSwap(participantClient1, setsToSell, true)
		const yesSharesNeeded = setsToSell + yesNeededForSwap
		const expectedDaiFromShares = setsToSell * numTicks
		await setERC1155Approval(participantClient1, shareTokenAddress, acpmAddress, true)

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
		assert.strictEqual(shareBalancesAfterExit[0], 3n, `Did not close out Invalid position when exiting Yes position`)
		assert.strictEqual(shareBalancesAfterExit[1], 0n, `Recieved No shares when exiting a Yes position`)
		assert.strictEqual(shareBalancesAfterExit[2], 0n, `Did not close out Yes position when exiting Yes position`)
	})

	test('canEnterAndExitNoPosition', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const participantClient1 = createWriteClient(mockWindow, TEST_ADDRESSES[1], 0)
		await deployAugurConstantProductMarketContract(client)

		const lpToBuy = 10000000n
		const shareTokenAddress = await getShareToken(participantClient1)
		const router = await getAugurConstantProductMarketRouterAddress()
		await approveCash(client)
		await approveCash(participantClient1)
		await setERC1155Approval(client, shareTokenAddress, router, true)
		await setERC1155Approval(participantClient1, shareTokenAddress, router, true)
		await addLiquidity(client, lpToBuy)

		const originalDaiBalance = await getCashBalance(participantClient1)

		// Enter position
		const amountInDai = 50000n
		const baseSharesExpected = amountInDai / numTicks
		const expectedSwapShares = await expectedSharesAfterSwap(participantClient1, baseSharesExpected, true)
		const expectedNoShares = baseSharesExpected + expectedSwapShares
		await enterPosition(participantClient1, amountInDai, false)

		const shareBalances = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalances[0], baseSharesExpected, `Did not receive expected Invalid shares when purchasing No: Got ${shareBalances[0]}. Expected: ${baseSharesExpected}`)
		assert.strictEqual(shareBalances[1], expectedNoShares, `Did not recieve expected No shares when purchasing No: Got ${shareBalances[1]}. Expected: ${expectedNoShares}`)
		assert.strictEqual(shareBalances[2], 0n, `Recieved Yes shares when purchasing No`)

		const daiBalance = await getCashBalance(participantClient1)
		const expectedDaiBalance = originalDaiBalance - amountInDai
		assert.strictEqual(daiBalance, expectedDaiBalance, `Dai not sent as expected. Balance: ${daiBalance}. Expected: ${expectedDaiBalance}`)

		// Exit Position
		const acpmAddress = await getAugurConstantProductMarketAddress(participantClient1)
		const expectedDaiFromShares = (shareBalances[0] - 3n) * numTicks
		await setERC1155Approval(participantClient1, shareTokenAddress, acpmAddress, true)
		await exitPosition(participantClient1, expectedDaiFromShares)

		const reportingFee = await getReportingFee(participantClient1)
		const daiBalanceAfterExit = await getCashBalance(participantClient1)
		const expectedDaiFromSharesAfterReportingFee = expectedDaiFromShares - (expectedDaiFromShares / reportingFee)
		const expectedDaiBalanceAfterExit = expectedDaiBalance + expectedDaiFromSharesAfterReportingFee
		assert.strictEqual(daiBalanceAfterExit, expectedDaiBalanceAfterExit, `Dai not recieved as expected. Balance ${daiBalanceAfterExit}. Expected: ${expectedDaiBalanceAfterExit}`)

		const shareBalancesAfterExit = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalancesAfterExit[0], 3n, `Did not close out Invalid position when exiting No position`)
		assert.strictEqual(shareBalancesAfterExit[1], 0n, `Did not close out No position when exiting No position`)
		assert.strictEqual(shareBalancesAfterExit[2], 0n, `Recieved Yes shares when exiting a No position`)
	})

	test('canSwapNo', async () => {
		const liquidityProviderClient = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const participantClient1 = createWriteClient(mockWindow, TEST_ADDRESSES[1], 0)
		await deployAugurConstantProductMarketContract(liquidityProviderClient)

		const shareTokenAddress = await getShareToken(participantClient1)
		const router = await getAugurConstantProductMarketRouterAddress()

		const lpToBuy = 10000000n
		await approveCash(liquidityProviderClient)
		await approveCash(participantClient1)
		await setERC1155Approval(liquidityProviderClient, shareTokenAddress, router, true)
		await setERC1155Approval(participantClient1, shareTokenAddress, router, true)

		await addLiquidity(liquidityProviderClient, lpToBuy)

		// Enter NO position

		await approveCash(participantClient1)
		const amountInDai = 50000n
		const baseSharesExpected = amountInDai / numTicks
		const expectedSwapShares = await expectedSharesAfterSwap(participantClient1, baseSharesExpected, true)
		const expectedNoShares = baseSharesExpected + expectedSwapShares
		await enterPosition(participantClient1, amountInDai, false)

		const shareBalances = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalances[0], baseSharesExpected, `Did not receive expected Invalid shares when purchasing No: Got ${shareBalances[0]}. Expected: ${baseSharesExpected}`)
		assert.strictEqual(shareBalances[1], expectedNoShares, `Did not recieve expected No shares when purchasing No: Got ${shareBalances[1]}. Expected: ${expectedNoShares}`)
		assert.strictEqual(shareBalances[2], 0n, `Recieved Yes shares when purchasing No`)

		// Swap to Yes

		const acpmAddress = await getAugurConstantProductMarketAddress(participantClient1)
		const expectedYesShares = await expectedSharesAfterSwap(participantClient1, expectedNoShares, true)
		await setERC1155Approval(participantClient1, shareTokenAddress, acpmAddress, true)

		// Deadline check works
		assert.rejects(swap(participantClient1, expectedNoShares, false, 0n, 0n))

		// minSharesOut check works
		assert.rejects(swap(participantClient1, expectedNoShares, false, expectedYesShares + 1n))

		await swap(participantClient1, expectedNoShares, false)

		const shareBalancesAfterSwap = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalancesAfterSwap[0], baseSharesExpected, `Invalid shares changed during swap`)
		assert.strictEqual(shareBalancesAfterSwap[1], 0n, `Did not lose No shares when swapping No for Yes`)
		assert.strictEqual(shareBalancesAfterSwap[2], expectedYesShares, `Did not recieve expected Yes shares when swapping No for Yes: Got ${shareBalancesAfterSwap[2]}. Expected: ${expectedYesShares}`)
	})

	test('canSwapYes', async () => {
		const liquidityProviderClient = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const participantClient1 = createWriteClient(mockWindow, TEST_ADDRESSES[1], 0)
		await deployAugurConstantProductMarketContract(liquidityProviderClient)

		const shareTokenAddress = await getShareToken(participantClient1)
		const router = await getAugurConstantProductMarketRouterAddress()

		const lpToBuy = 10000000n
		await approveCash(liquidityProviderClient)
		await approveCash(participantClient1)
		await setERC1155Approval(liquidityProviderClient, shareTokenAddress, router, true)
		await setERC1155Approval(participantClient1, shareTokenAddress, router, true)
		await addLiquidity(liquidityProviderClient, lpToBuy)

		// Enter YES position
		await approveCash(participantClient1)
		const amountInDai = 50000n
		const baseSharesExpected = amountInDai / numTicks
		const expectedSwapShares = await expectedSharesAfterSwap(participantClient1, baseSharesExpected, false)
		const expectedYesShares = baseSharesExpected + expectedSwapShares
		await enterPosition(participantClient1, amountInDai, true)

		const shareBalances = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalances[0], baseSharesExpected, `Did not receive expected Invalid shares when purchasing No: Got ${shareBalances[0]}. Expected: ${baseSharesExpected}`)
		assert.strictEqual(shareBalances[1], 0n, `Recieved Yes shares when purchasing No`)
		assert.strictEqual(shareBalances[2], expectedYesShares, `Did not recieve expected Yes shares when purchasing Yes: Got ${shareBalances[2]}. Expected: ${expectedYesShares}`)

		// Swap Yes to No

		const acpmAddress = await getAugurConstantProductMarketAddress(participantClient1)
		const expectedNoShares = await expectedSharesAfterSwap(participantClient1, expectedYesShares, false)
		await setERC1155Approval(participantClient1, shareTokenAddress, acpmAddress, true)
		await swap(participantClient1, expectedYesShares, true)

		const shareBalancesAfterSwap = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalancesAfterSwap[0], baseSharesExpected, `Invalid shares changed during swap`)
		assert.strictEqual(shareBalancesAfterSwap[1], expectedNoShares, `Did not recieve expected No shares when swapping Yes for No: Got ${shareBalances[1]}. Expected: ${expectedNoShares}`)
		assert.strictEqual(shareBalancesAfterSwap[2], 0n, `Did not lose Yes shares when swapping Yes for No`)
	})

	test('canSwapForExact', async () => {
		const liquidityProviderClient = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const participantClient1 = createWriteClient(mockWindow, TEST_ADDRESSES[1], 0)
		await deployAugurConstantProductMarketContract(liquidityProviderClient)

		const shareTokenAddress = await getShareToken(participantClient1)
		const router = await getAugurConstantProductMarketRouterAddress()

		const lpToBuy = 10000000n
		await approveCash(liquidityProviderClient)
		await approveCash(participantClient1)
		await setERC1155Approval(liquidityProviderClient, shareTokenAddress, router, true)
		await setERC1155Approval(participantClient1, shareTokenAddress, router, true)
		await addLiquidity(liquidityProviderClient, lpToBuy)

		// Enter YES position
		await approveCash(participantClient1)
		const amountInDai = 50000n
		const baseSharesExpected = amountInDai / numTicks
		const expectedSwapShares = await expectedSharesAfterSwap(participantClient1, baseSharesExpected, false)
		const expectedYesShares = baseSharesExpected + expectedSwapShares
		await enterPosition(participantClient1, amountInDai, true)

		const shareBalances = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalances[0], baseSharesExpected, `Did not receive expected Invalid shares when purchasing No: Got ${shareBalances[0]}. Expected: ${baseSharesExpected}`)
		assert.strictEqual(shareBalances[1], 0n, `Recieved Yes shares when purchasing No`)
		assert.strictEqual(shareBalances[2], expectedYesShares, `Did not recieve expected Yes shares when purchasing Yes: Got ${shareBalances[2]}. Expected: ${expectedYesShares}`)

		// Swap Yes to No

		const expectedNoShares = await expectedSharesAfterSwap(participantClient1, expectedYesShares, true)

		// Deadline check works
		assert.rejects(swapForExact(participantClient1, expectedNoShares, true, expectedYesShares, 0n))

		// maxSharesIn check works
		assert.rejects(swapForExact(participantClient1, expectedNoShares, true, expectedYesShares - 1n))

		await swapForExact(participantClient1, expectedNoShares, true)

		const shareBalancesAfterSwap = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalancesAfterSwap[0], baseSharesExpected, `Invalid shares changed during swap`)
		assert.strictEqual(shareBalancesAfterSwap[1], expectedNoShares, `Did not recieve expected No shares when swapping Yes for No: Got ${shareBalances[1]}. Expected: ${expectedNoShares}`)
		assert.strictEqual(shareBalancesAfterSwap[2], 0n, `Did not lose Yes shares when swapping Yes for No`)

		// Swap No to Yes
		const expectedYesShares2 = await expectedSharesAfterSwap(participantClient1, expectedNoShares, false)
		await swapForExact(participantClient1, expectedYesShares2, false)

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

		await deployAugurConstantProductMarketContract(liquidityProviderClient1)

		await approveCash(liquidityProviderClient1)
		await approveCash(liquidityProviderClient2)
		await approveCash(participantClient1)
		await approveCash(participantClient2)

		const router = await getAugurConstantProductMarketRouterAddress()
		const shareTokenAddress = await getShareToken(participantClient1)
		const acpmAddress = await getAugurConstantProductMarketAddress(participantClient1)
		await setERC1155Approval(liquidityProviderClient1, shareTokenAddress, router, true)
		await setERC1155Approval(liquidityProviderClient2, shareTokenAddress, router, true)
		await setERC1155Approval(participantClient1, shareTokenAddress, router, true)
		await setERC1155Approval(participantClient2, shareTokenAddress, router, true)

		await approveToken(liquidityProviderClient1, acpmAddress, router)
		await approveToken(liquidityProviderClient2, acpmAddress, router)

		// First LP
		const lpToBuy = 10000000n
		await addLiquidity(liquidityProviderClient1, lpToBuy)

		// Second LP
		await addLiquidity(liquidityProviderClient2, lpToBuy)

		// participant 1 enters Yes
		const amountInDai = 50000n
		const baseYesSharesExpected = amountInDai / numTicks
		const expectedYesSwapShares = await expectedSharesAfterSwap(participantClient1, baseYesSharesExpected, false)
		const expectedYesShares = baseYesSharesExpected + expectedYesSwapShares
		await enterPosition(participantClient1, amountInDai, true)

		const shareBalancesAfterEnterYes = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalancesAfterEnterYes[0], baseYesSharesExpected, `Did not receive expected Invalid shares when purchasing No: Got ${shareBalancesAfterEnterYes[0]}. Expected: ${baseYesSharesExpected}`)
		assert.strictEqual(shareBalancesAfterEnterYes[1], 0n, `Recieved Yes shares when purchasing No`)
		assert.strictEqual(shareBalancesAfterEnterYes[2], expectedYesShares, `Did not recieve expected Yes shares when purchasing Yes: Got ${shareBalancesAfterEnterYes[2]}. Expected: ${expectedYesShares}`)

		// participant 2 enters No
		const baseNoSharesExpected = amountInDai / numTicks
		const expectedNoSwapShares = await expectedSharesAfterSwap(participantClient2, baseNoSharesExpected, true)
		const expectedNoShares = baseNoSharesExpected + expectedNoSwapShares
		await enterPosition(participantClient2, amountInDai, false)

		const shareBalancesAfterEnterNo = await getShareBalances(participantClient2, participantClient2.account.address)
		assert.strictEqual(shareBalancesAfterEnterNo[0], baseNoSharesExpected, `Did not receive expected Invalid shares when purchasing No: Got ${shareBalancesAfterEnterNo[0]}. Expected: ${baseNoSharesExpected}`)
		assert.strictEqual(shareBalancesAfterEnterNo[1], expectedNoShares, `Did not recieve expected No shares when purchasing No: Got ${shareBalancesAfterEnterNo[1]}. Expected: ${expectedNoShares}`)
		assert.strictEqual(shareBalancesAfterEnterNo[2], 0n, `Recieved Yes shares when purchasing No`)

		// Second LP removes partial liquidity
		const daiBalanceBeforePartialRemoval = await getCashBalance(liquidityProviderClient2)
		const partialLiquidityRemovalAmount = lpToBuy / 2n
		const expectedLiquidityAfterRemoval = lpToBuy - partialLiquidityRemovalAmount
		await removeLiquidity(liquidityProviderClient2, partialLiquidityRemovalAmount)
		const newLPBalance = await getPoolLiquidityBalance(liquidityProviderClient2)
		assert.strictEqual(newLPBalance, expectedLiquidityAfterRemoval, `Liquidity not removed correctly`)

		const shareBalancesAfterPartialExit = await getShareBalances(liquidityProviderClient2, liquidityProviderClient2.account.address)
		assert.strictEqual(shareBalancesAfterPartialExit[0], lpToBuy - partialLiquidityRemovalAmount, `User did not close out Invalid share`)
		assert.strictEqual(shareBalancesAfterPartialExit[1], 0n, `User received No shares incorrectly`)
		assert.strictEqual(shareBalancesAfterPartialExit[2], 0n, `User did not close out Yes share`)

		const reportingFee = await getReportingFee(liquidityProviderClient2)
		const daiBalanceAfterPartialRemoval = await getCashBalance(liquidityProviderClient2)
		const completeSetSaleDai = partialLiquidityRemovalAmount * numTicks
		const expectedReturn = completeSetSaleDai - (completeSetSaleDai / reportingFee)
		const expectedDaiBalanceAfterPartialRemoval = daiBalanceBeforePartialRemoval + expectedReturn
		assert.strictEqual(daiBalanceAfterPartialRemoval, expectedDaiBalanceAfterPartialRemoval, `Dai not returned as expected. Got ${daiBalanceAfterPartialRemoval}. Expected: ${expectedDaiBalanceAfterPartialRemoval}`)

		// Participant 1 Swaps partially to No

		const amountToSwapToNo = expectedYesShares / 2n
		const expectedNoSharesAfterPartialSwap = await expectedSharesAfterSwap(participantClient1, amountToSwapToNo, true)
		await swap(participantClient1, amountToSwapToNo, true)

		const shareBalancesAfterSwap = await getShareBalances(participantClient1, participantClient1.account.address)
		assert.strictEqual(shareBalancesAfterSwap[0], baseYesSharesExpected, `Invalid shares changed during swap`)
		assert.strictEqual(shareBalancesAfterSwap[1], expectedNoSharesAfterPartialSwap, `Did not recieve expected No shares when swapping Yes for No: Got ${shareBalancesAfterSwap[1]}. Expected: ${expectedNoSharesAfterPartialSwap}`)
		assert.strictEqual(shareBalancesAfterSwap[2], expectedYesShares - amountToSwapToNo, `Did not lose Yes shares when swapping Yes for No`)

		// Participant 2 swaps entirely to Yes
		const amountToSwapToYes = expectedNoShares
		const expectedYesSharesAfterTotalSwap = await expectedSharesAfterSwap(participantClient2, amountToSwapToYes, false)
		await swap(participantClient2, amountToSwapToYes, false)

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
		const daiBalanceBeforeTotalLiquidityRemoval = await getCashBalance(liquidityProviderClient1)
		const acpmDaiBalanceBeforeTotalRemoval = await getCashBalance(liquidityProviderClient1, acpmAddress)
		const totalSupplyBeforeTotalRemoval = await getPoolSupply(liquidityProviderClient1)
		const acpmShareBalancesBeforeTotalLiquidityRemoval = await getShareBalances(liquidityProviderClient1, acpmAddress)
		await removeLiquidity(liquidityProviderClient1, lpToBuy)

		const daiBalanceAfterTotalRemoval = await getCashBalance(liquidityProviderClient1)
		const shareOfDaiFromTotalRemoval = acpmDaiBalanceBeforeTotalRemoval * lpToBuy / totalSupplyBeforeTotalRemoval
		const shareOfCompleteSetTotalSale = (acpmShareBalancesBeforeTotalLiquidityRemoval[2] * lpToBuy / totalSupplyBeforeTotalRemoval) * numTicks
		const expectedShareOfCompleteSetTotalSaleAfterFee = shareOfCompleteSetTotalSale - (shareOfCompleteSetTotalSale / reportingFee)
		const expectedReturnFromTotalRemoval = expectedShareOfCompleteSetTotalSaleAfterFee + shareOfDaiFromTotalRemoval
		const expectedDaiBalanceAfterTotalRemoval = daiBalanceBeforeTotalLiquidityRemoval + expectedReturnFromTotalRemoval
		assert.strictEqual(daiBalanceAfterTotalRemoval, expectedDaiBalanceAfterTotalRemoval, `Dai not returned as expected. Got ${daiBalanceAfterTotalRemoval}. Expected: ${expectedDaiBalanceAfterTotalRemoval}`)
		const shareBalancesAfterTotalRemoval = await getShareBalances(liquidityProviderClient1, liquidityProviderClient1.account.address)
		assert.strictEqual(shareBalancesAfterTotalRemoval[0], 28n, `User did not receive excess Invalid shares`)
		assert.strictEqual(shareBalancesAfterTotalRemoval[1], 64n, `User did not receive excess No shares`)
		assert.strictEqual(shareBalancesAfterTotalRemoval[2], 0n, `User received Yes shares incorrectly`)

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
		const daiBalanceBeforeFinalLiquidityRemoval = await getCashBalance(liquidityProviderClient2)
		const acpmDaiBalanceBeforeFinalRemoval = await getCashBalance(liquidityProviderClient2, acpmAddress)
		const acpmShareBalancesBeforeFinalLiquidityRemoval = await getShareBalances(liquidityProviderClient2, acpmAddress)

		await removeLiquidity(liquidityProviderClient2, lpToBuy - partialLiquidityRemovalAmount)
		const daiBalance = await getCashBalance(liquidityProviderClient2)
		const daiFromFinalCompleteSetSale = acpmShareBalancesBeforeFinalLiquidityRemoval[1] * numTicks
		const daiFromFinalCompleteSetSaleAfterFee = daiFromFinalCompleteSetSale - (daiFromFinalCompleteSetSale / reportingFee)
		const expectedDaiBalance = daiBalanceBeforeFinalLiquidityRemoval + daiFromFinalCompleteSetSaleAfterFee + acpmDaiBalanceBeforeFinalRemoval
		assert.strictEqual(daiBalance, expectedDaiBalance, `Dai not returned as expected. Got ${daiBalance}. Expected: ${expectedDaiBalance}`)

		const finalShareBalances = await getShareBalances(liquidityProviderClient2, liquidityProviderClient2.account.address)
		assert.strictEqual(finalShareBalances[0], 4n, `User did not receive excess Invalid shares`)
		assert.strictEqual(finalShareBalances[1], 0n, `User received No shares incorrectly`)
		assert.strictEqual(finalShareBalances[2], 16n, `User did not receive excess Yes shares`)
	})

	test('canOnlyWithdrawProfitUpToInitialEntry', async () => {
		const liquidityProviderClient = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const participantClient1 = createWriteClient(mockWindow, TEST_ADDRESSES[2], 0)
		const participantClient2 = createWriteClient(mockWindow, TEST_ADDRESSES[3], 0)

		await deployAugurConstantProductMarketContract(liquidityProviderClient)

		await approveCash(liquidityProviderClient)
		await approveCash(participantClient1)
		await approveCash(participantClient2)

		const shareTokenAddress = await getShareToken(participantClient1)
		const router = await getAugurConstantProductMarketRouterAddress()
		await setERC1155Approval(liquidityProviderClient, shareTokenAddress, router, true)
		await setERC1155Approval(participantClient1, shareTokenAddress, router, true)
		await setERC1155Approval(participantClient2, shareTokenAddress, router, true)

		// Provide Liquidity
		const lpToBuy = 1000000n
		await addLiquidity(liquidityProviderClient, lpToBuy)

		// participant 1 enters Yes
		const amountInDai = 1000000n
		await enterPosition(participantClient1, amountInDai, true)

		// participant 2 enters Yes with much higher amount
		await enterPosition(participantClient2, amountInDai * 100n, true)

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
				await deployAugurConstantProductMarketContract(liquidityProviderClient)
				const acpmAddress = await getAugurConstantProductMarketAddress(participantClient1)
				const shareTokenAddress = await getShareToken(participantClient1)
				const router = await getAugurConstantProductMarketRouterAddress()

				const lpToBuy = 10000000n
				await approveCash(liquidityProviderClient)
				await approveCash(participantClient1)
				await approveCash(participantClient2)
				await setERC1155Approval(liquidityProviderClient, shareTokenAddress, router, true)
				await setERC1155Approval(participantClient1, shareTokenAddress, router, true)
				await setERC1155Approval(participantClient2, shareTokenAddress, router, true)

				await addLiquidity(liquidityProviderClient, lpToBuy)

				// Participant 1 enters position
				const baseSharesExpected1 = testCase.position1Size / numTicks
				const expectedSwapShares1 = await expectedSharesAfterSwap(participantClient1, baseSharesExpected1, !testCase.yes)
				const expectedShares1 = baseSharesExpected1 + expectedSwapShares1
				await enterPosition(participantClient1, testCase.position1Size, testCase.yes)

				const shareBalances1 = await getShareBalances(participantClient1, participantClient1.account.address)
				assert.strictEqual(shareBalances1[0], baseSharesExpected1)
				assert.strictEqual(shareBalances1[1], testCase.yes ? 0n : expectedShares1)
				assert.strictEqual(shareBalances1[2], testCase.yes ? expectedShares1: 0n)

				// Participant 2 enters opposing position
				const baseSharesExpected2 = testCase.position2Size / numTicks
				const expectedSwapShares2 = await expectedSharesAfterSwap(participantClient2, baseSharesExpected2, testCase.yes)
				const expectedShares2 = baseSharesExpected2 + expectedSwapShares2
				await enterPosition(participantClient2, testCase.position2Size, !testCase.yes)

				const shareBalances2 = await getShareBalances(participantClient2, participantClient2.account.address)
				assert.strictEqual(shareBalances2[0], baseSharesExpected2)
				assert.strictEqual(shareBalances2[1], testCase.yes ? expectedShares2 : 0n)
				assert.strictEqual(shareBalances2[2], testCase.yes ? 0n : expectedShares2)

				// Participant 1 swaps to opposing position
				const expectedNoSharesAfterSwap = await expectedSharesAfterSwap(participantClient1, expectedShares1, testCase.yes)
				await setERC1155Approval(participantClient1, shareTokenAddress, acpmAddress, true)
				await swap(participantClient1, expectedShares1, testCase.yes)

				const shareBalancesAfterSwap = await getShareBalances(participantClient1, participantClient1.account.address)
				assert.strictEqual(shareBalancesAfterSwap[0], baseSharesExpected1)
				assert.strictEqual(shareBalancesAfterSwap[1], testCase.yes ? expectedNoSharesAfterSwap : 0n)
				assert.strictEqual(shareBalancesAfterSwap[2], testCase.yes ? 0n : expectedNoSharesAfterSwap)

				// Participant 2 exits position
				const daiBalanceBeforeExit = await getCashBalance(participantClient2)
				const sharesToSell = shareBalances2[0] / 2n
				const expectedDaiFromShares = sharesToSell * numTicks
				const sharesNeededToSwap = await expectedSharesNeededForSwap(participantClient2, sharesToSell, !testCase.yes)
				const expectedInvalidSharesAfterExit = shareBalances2[0] - sharesToSell
				const expectedSharesAfterExit = shareBalances2[testCase.yes ? 1 : 2] - sharesNeededToSwap - sharesToSell
				await setERC1155Approval(participantClient2, shareTokenAddress, acpmAddress, true)
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
				await deployAugurConstantProductMarketContract(liquidityProviderClient)
				const shareTokenAddress = await getShareToken(participantClient)
				const router = await getAugurConstantProductMarketRouterAddress()

				const lpToBuy = 1000000000n
				await approveCash(liquidityProviderClient)
				await approveCash(participantClient)
				await setERC1155Approval(liquidityProviderClient, shareTokenAddress, router, true)
				await setERC1155Approval(participantClient, shareTokenAddress, router, true)

				await addLiquidity(liquidityProviderClient, lpToBuy)

				// Participant enters position
				const baseSharesExpected = testCase.positionSize / numTicks
				const expectedSwapShares = await expectedSharesAfterSwap(participantClient, baseSharesExpected, !testCase.yes)
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
				const sharesNeededForSwap = await expectedSharesNeededForSwap(participantClient, opposingSharesDesired, testCase.yes)
				let sharesToSell = shareBalances[0]
				if (sharesNeededForSwap > sharesToSwap) {
					const worstRate = await expectedSharesAfterSwap(participantClient, positionShares, testCase.yes)
					const swapAmount = positionShares**2n / (positionShares + worstRate)
					sharesToSell = positionShares - swapAmount
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

	test('canUseViewFunctionsWithNoData', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		await deployAugurConstantProductMarketContract(client)

		// shareBalances
		const shareBalances = await getShareBalances(client, client.account.address)
		assert.strictEqual(shareBalances[0], 0n)

		// noYoShareBalances
		const noYesShareBalances = await getNoYesShareBalances(client, client.account.address)
		assert.strictEqual(noYesShareBalances[0], 0n)
	})

	test('canUseSwapCalculations', async () => {
		const liquidityProviderClient = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const participantClient1 = createWriteClient(mockWindow, TEST_ADDRESSES[1], 0)
		await deployAugurConstantProductMarketContract(liquidityProviderClient)
		const shareTokenAddress = await getShareToken(participantClient1)
		const router = await getAugurConstantProductMarketRouterAddress()

		const lpToBuy = 100000000n
		await approveCash(liquidityProviderClient)
		await approveCash(participantClient1)
		await setERC1155Approval(liquidityProviderClient, shareTokenAddress, router, true)
		await setERC1155Approval(participantClient1, shareTokenAddress, router, true)
		await addLiquidity(liquidityProviderClient, lpToBuy)

		const sharesToRecieve = 10000000n;
		const sharesNeededToSwap = await expectedSharesNeededForSwap(participantClient1, sharesToRecieve, true)
		const expectedSharesRecieved = await expectedSharesAfterSwap(participantClient1, sharesNeededToSwap, true)
		const delta = expectedSharesRecieved - sharesNeededToSwap
		assert.ok(delta <= 1n)
	})
})
