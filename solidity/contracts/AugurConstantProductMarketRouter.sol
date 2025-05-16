// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.29;

import { IERC1155 } from "./IERC1155.sol";
import { IERC20 } from "./IERC20.sol";
import { IAugurConstantProductShareToken } from "./IAugurConstantProductShareToken.sol";
import { IMarket } from "./IMarket.sol";
import { IAugur } from "./IAugur.sol";
import { IOICash } from "./IOICash.sol";
import { IAugurConstantProduct } from "./IAugurConstantProduct.sol";
import { Constants } from "./Constants.sol";
import { TokenId } from "./TokenId.sol";

contract AugurConstantProductRouter {

	IAugurConstantProductShareToken shareToken;
	IERC20 public dai = IERC20(Constants.DAI_ADDRESS);
	IAugur public constant augur = IAugur(Constants.AUGUR_ADDRESS);
	uint256 private constant numTicks = 1000;

	constructor() {
		dai.approve(Constants.AUGUR_ADDRESS, 2**256-1);
	}

	function initialize(IAugurConstantProductShareToken acpmShareToken) external {
		require(address(shareToken) == address(0), "AugurCP: already initialized");
		shareToken = acpmShareToken;
		dai.approve(address(shareToken), 2**256-1);
	}

	function addLiquidity(IAugurConstantProduct acpm, uint256 setsToBuy) external {
		dai.transferFrom(msg.sender, address(this), setsToBuy * numTicks);
		shareToken.buyCompleteSets(address(acpm), msg.sender, setsToBuy);

		(uint256 poolNoBalance, uint256 poolYesBalance) = acpm.getNoYesBalances();

		uint256[] memory tokenIds = new uint256[](2);
		uint256[] memory tokenValues = new uint256[](2);
		tokenIds[0] = TokenId.getTokenId(address(acpm), 1);
		tokenIds[1] = TokenId.getTokenId(address(acpm), 2);
		if (poolYesBalance == poolNoBalance) {
			tokenValues[0] = setsToBuy;
			tokenValues[1] = setsToBuy;
		} else if (poolYesBalance > poolNoBalance) {
			tokenValues[0] = setsToBuy * poolNoBalance / poolYesBalance;
			tokenValues[1] = setsToBuy;
		} else {
			tokenValues[0] = setsToBuy;
			tokenValues[1] = setsToBuy * poolYesBalance / poolNoBalance;
		}
		shareToken.unsafeBatchTransferFrom(msg.sender, address(acpm), tokenIds, tokenValues);

		acpm.mint(msg.sender);
	}

	function removeLiquidity(IAugurConstantProduct acpm, uint256 poolTokensToSell) external {
		acpm.transferFrom(msg.sender, address(acpm), poolTokensToSell);
		(uint256 noSharesReceived, uint256 yesSharesReceived) = acpm.burn(msg.sender);
		uint256 invalidShares = shareToken.balanceOf(msg.sender, TokenId.getTokenId(address(acpm), 0));

		uint256 completeSetsToSell = invalidShares;
		completeSetsToSell = noSharesReceived < completeSetsToSell ? noSharesReceived : completeSetsToSell;
		completeSetsToSell = yesSharesReceived < completeSetsToSell ? yesSharesReceived : completeSetsToSell;
		shareToken.sellCompleteSets(address(acpm), msg.sender, msg.sender, completeSetsToSell);
	}

	function enterPosition(IAugurConstantProduct acpm, uint256 amountInDai, bool buyYes, uint256 minSharesOut, uint256 deadline) external {
		require(block.timestamp < deadline, "AugurCP: Deadline");
		uint256 setsToBuy = amountInDai / numTicks;
		dai.transferFrom(msg.sender, address(this), amountInDai);
		shareToken.buyCompleteSets(address(acpm), msg.sender, setsToBuy);

		(uint256 poolNoBalance, uint256 poolYesBalance) = acpm.getNoYesBalances();

		if (buyYes) {
			uint256 amountYesOut = getAmountOut(setsToBuy, poolNoBalance, poolYesBalance, acpm.fee());
			require(amountYesOut + setsToBuy >= minSharesOut, "AugurCP: Enter would result in < minShares");
			shareToken.unsafeTransferFrom(msg.sender, address(acpm), acpm.NO(), setsToBuy);
			acpm.swap(msg.sender, 0, amountYesOut);
		} else {
			uint256 amountNoOut = getAmountOut(setsToBuy, poolYesBalance, poolNoBalance, acpm.fee());
			require(amountNoOut + setsToBuy >= minSharesOut, "AugurCP: Enter would result in < minShares");
			shareToken.unsafeTransferFrom(msg.sender, address(acpm), acpm.YES(), setsToBuy);
			acpm.swap(msg.sender, amountNoOut, 0);
		}
	}

	function exitPosition(IAugurConstantProduct acpm, uint256 daiToBuy, uint256 maxSharesIn, uint256 deadline) external {
		require(block.timestamp < deadline, "AugurCP: Deadline");
		(uint256 userInvalid, uint256 userNo, uint256 userYes) = acpm.shareBalances(msg.sender);
		uint256 setsToSell = daiToBuy / numTicks;

		// short circuit if user is closing out their own complete sets
		if (userInvalid >= setsToSell && userNo >= setsToSell && userYes >= setsToSell) {
			shareToken.sellCompleteSets(address(acpm), msg.sender, msg.sender, setsToSell);
			return;
		}

		require(userInvalid >= setsToSell, "AugurCP: You don't have enough invalid tokens to close out for this amount.");
		require(userNo > setsToSell || userYes > setsToSell, "AugurCP: You don't have enough YES or NO tokens to close out for this amount.");

		(uint256 poolNoBalance, uint256 poolYesBalance) = acpm.getNoYesBalances();
		uint256 fee = acpm.fee();

		if (userYes > userNo) {
			uint256 noNeeded = setsToSell - userNo;
			uint256 yesToSwap = userYes - setsToSell;
			uint256 yesNeeded = getAmountIn(noNeeded, poolYesBalance, poolNoBalance, fee);
			require(yesNeeded <= yesToSwap, "AugurCP: Not enough YES shares to close out for this amount");
			require(setsToSell + yesNeeded <= maxSharesIn, "AugurCP: YES shares needed > maxSharesIn");
			shareToken.unsafeTransferFrom(msg.sender, address(acpm), TokenId.getTokenId(address(acpm), 2), yesNeeded);
			acpm.swap(msg.sender, noNeeded, 0);
		} else {
			uint256 yesNeeded = setsToSell - userYes;
			uint256 noToSwap = userNo - setsToSell;
			uint256 noNeeded = getAmountIn(yesNeeded, poolNoBalance, poolYesBalance, fee);
			require(noNeeded <= noToSwap, "AugurCP: Not enough No shares to close out for this amount");
			require(setsToSell + noNeeded <= maxSharesIn, "AugurCP: No shares needed > maxSharesIn");
			shareToken.unsafeTransferFrom(msg.sender, address(acpm), TokenId.getTokenId(address(acpm), 1), noNeeded);
			acpm.swap(msg.sender, 0, yesNeeded);
		}

		shareToken.sellCompleteSets(address(acpm), msg.sender, msg.sender, setsToSell);
	}

	function swapExactSharesForShares(IAugurConstantProduct acpm, uint256 inputShares, bool inputYes, uint256 minSharesOut, uint256 deadline) external {
		require(block.timestamp < deadline, "AugurCP: Deadline");
		(uint256 poolNo, uint256 poolYes) = acpm.getNoYesBalances();
		uint256 amountOut = getAmountOut(inputShares, inputYes ? poolYes : poolNo, inputYes ? poolNo : poolYes, acpm.fee());
		require(amountOut >= minSharesOut, "AugurCP: shares out < minSharesOut");
		shareToken.unsafeTransferFrom(msg.sender, address(acpm), inputYes ? TokenId.getTokenId(address(acpm), 2) : TokenId.getTokenId(address(acpm), 1), inputShares);
		acpm.swap(msg.sender, inputYes ? amountOut : 0, inputYes ? 0 : amountOut);
	}

	function swapSharesForExactShares(IAugurConstantProduct acpm, uint256 outputShares, bool inputYes, uint256 maxSharesIn, uint256 deadline) external {
		require(block.timestamp < deadline, "AugurCP: Deadline");
		(uint256 poolNo, uint256 poolYes) = acpm.getNoYesBalances();
		uint256 amountIn = getAmountIn(outputShares, inputYes ? poolYes : poolNo, inputYes ? poolNo : poolYes, acpm.fee());
		require(amountIn <= maxSharesIn, "AugurCP: shares in > maxSharesIn");
		shareToken.unsafeTransferFrom(msg.sender, address(acpm), inputYes ? TokenId.getTokenId(address(acpm), 2) : TokenId.getTokenId(address(acpm), 1), amountIn);
		acpm.swap(msg.sender, inputYes ? outputShares : 0, inputYes ? 0 : outputShares);
	}

	function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut, uint256 fee) internal pure returns (uint256 amountOut) {
		require(amountIn > 0, 'AugurCP: INSUFFICIENT_INPUT_AMOUNT');
		require(reserveIn > 0 && reserveOut > 0, 'AugurCP: INSUFFICIENT_LIQUIDITY');
		uint256 amountInWithFee = amountIn * (1000 - fee);
		uint256 numerator = amountInWithFee * reserveOut;
		uint256 denominator = (reserveIn * 1000) + amountInWithFee;
		amountOut = numerator / denominator;
	}

	function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut, uint256 fee) internal pure returns (uint256 amountIn) {
		require(amountOut > 0, 'AugurCP: INSUFFICIENT_OUTPUT_AMOUNT');
		require(reserveIn > 0 && reserveOut > 0, 'AugurCP: INSUFFICIENT_LIQUIDITY');
		uint256 numerator = reserveIn * amountOut * 1000;
		uint256 denominator = (reserveOut - amountOut) * (1000 - fee);
		amountIn = (numerator / denominator) + 1;
	}
}
