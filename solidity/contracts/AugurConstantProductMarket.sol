// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.29;

import { ERC20 } from "./ERC20.sol";
import { IERC20 } from "./IERC20.sol";
import { IShareToken } from "./IShareToken.sol";
import { IMarket } from "./IMarket.sol";
import { IAugur } from "./IAugur.sol";
import { Constants } from "./Constants.sol";
import { AddressToString } from "./AddressToString.sol";

contract AugurConstantProduct is ERC20 {
	using AddressToString for address;

	IShareToken public shareToken;
	address public augurMarketAddress;
	IAugur public constant augur = IAugur(Constants.AUGUR_ADDRESS);
	uint256 public INVALID;
	uint256 public NO;
	uint256 public YES;
	uint256 public noBalance;
	uint256 public yesBalance;
	uint256 public constant feeScope = 1000;
	uint256 public constant fee = 50; // 5% fee

	uint private unlocked = 1;
	modifier lock() {
		require(unlocked == 1, 'LOCKED');
		unlocked = 0;
		_;
		unlocked = 1;
	}

	constructor(IMarket market) ERC20(string(abi.encodePacked("ACPM-", address(market).addressToString())), address(market).addressToString()) {
		augurMarketAddress = address(market);
		shareToken = market.shareToken();
		require(augur.getMarketType(market) == 0, "AugurCP: ACPM only supports Yes No Markets");
		INVALID = shareToken.getTokenId(augurMarketAddress, 0);
		NO = shareToken.getTokenId(augurMarketAddress, 1);
		YES = shareToken.getTokenId(augurMarketAddress, 2);
	}

	function mint(address mintTo) lock external {
		(uint256 poolNo, uint256 poolYes) = noYesShareBalances(address(this));
		uint256 noIn = poolNo - noBalance;
		uint256 yesIn = poolYes - yesBalance;

		uint256 supply = totalSupply();
		uint256 liquidity = 0;

		if (supply == 0) {
			liquidity = sqrt(noIn * yesIn); // CONSIDER: MINIMUM BALANCE handling?
		} else {
			uint256 liquidity1 = noIn * supply / noBalance;
			uint256 liquidity2 = yesIn * supply / yesBalance;
			liquidity = liquidity1 < liquidity2 ? liquidity1 : liquidity2;
		}

		_mint(mintTo, liquidity);

		noBalance = poolNo;
		yesBalance = poolYes;
	}

	function burn(address sharesTo) lock external returns (uint256 noShare, uint256 yesShare) {
		uint256 poolSupply = totalSupply();
		(uint256 poolNo, uint256 poolYes) = noYesShareBalances(address(this));

		uint256 liquidity = balanceOf(address(this));

		_burn(address(this), liquidity);

		noShare = poolNo * liquidity / poolSupply;
		yesShare = poolYes * liquidity / poolSupply;

		shareTransfer(address(this), sharesTo, noShare, yesShare);

		noBalance = poolNo - noShare;
		yesBalance = poolYes - yesShare;
	}

	function swap(address to, uint256 noSharesOut, uint256 yesSharesOut) lock external {
		shareTransfer(address(this), to, noSharesOut, yesSharesOut);

		(uint256 poolNo, uint256 poolYes) = noYesShareBalances(address(this));

		uint256 noSharesIn = poolNo > noBalance - noSharesOut ? poolNo - (noBalance - noSharesOut) : 0;
		uint256 yesSharesIn = poolYes > yesBalance - yesSharesOut ? poolYes - (yesBalance - yesSharesOut) : 0;
		require(noSharesIn > 0 || yesSharesIn > 0, 'AugurCP: INSUFFICIENT_INPUT_AMOUNT');

		uint256 noBalanceAdjusted = (poolNo * feeScope) - (noSharesIn * fee);
		uint256 yesBalanceAdjusted = (poolYes * feeScope) - (yesSharesIn * fee);
		require(noBalanceAdjusted * yesBalanceAdjusted >= noBalance * yesBalance * feeScope**2, 'AugurCP: Constant product constant was not maintained');

		noBalance = poolNo;
		yesBalance = poolYes;
	}

	function getNoYesBalances() public view returns (uint256, uint256) {
		return (noBalance, yesBalance);
	}

	function noYesShareBalances(address owner) public view returns (uint256 no, uint256 yes) {
		uint256[] memory tokenIds = new uint256[](2);
		tokenIds[0] = NO;
		tokenIds[1] = YES;
		address[] memory owners = new address[](2);
		owners[0] = owner;
		owners[1] = owner;
		uint256[] memory balances = shareToken.balanceOfBatch(owners, tokenIds);
		no = balances[0];
		yes = balances[1];
		return (no, yes);
	}

	function shareBalances(address owner) public view returns (uint256 invalid, uint256 no, uint256 yes) {
		uint256[] memory tokenIds = new uint256[](3);
		tokenIds[0] = INVALID;
		tokenIds[1] = NO;
		tokenIds[2] = YES;
		address[] memory owners = new address[](3);
		owners[0] = owner;
		owners[1] = owner;
		owners[2] = owner;
		uint256[] memory balances = shareToken.balanceOfBatch(owners, tokenIds);
		invalid = balances[0];
		no = balances[1];
		yes = balances[2];
		return (invalid, no, yes);
	}

	function shareTransfer(address from, address to, uint256 noAmount, uint256 yesAmount) private {
		uint256 size = (noAmount != 0 ? 1 : 0) + (yesAmount != 0 ? 1 : 0);
		if (size == 0) return;
		uint256[] memory tokenIds = new uint256[](size);
		uint256[] memory amounts = new uint256[](size);
		if (size == 1) {
			tokenIds[0] = noAmount != 0 ? NO : YES;
			amounts[0] = noAmount != 0 ? noAmount : yesAmount;
		} else if (size == 2) {
			tokenIds[0] = NO;
			tokenIds[1] = YES;
			amounts[0] = noAmount;
			amounts[1] = yesAmount;
		}
		shareToken.unsafeBatchTransferFrom(from, to, tokenIds, amounts);
	}

	// formula where x = yes shares owned when swapping yes
	// s = (nf + 1000x -xf - 1000y - 1000n + sqrt(x^2f^2 - 2000x^2f + 1000000x^2 - 2000000nx - 2nxf^2 + 4000nxf + 2000000xy - 2000xfy + 1000000n^2 + n^2f^2 - 2000n^2f + 1000000y^2 + 2000000ny - 2000nfy)) / 2(1000 - f)
	// s = swap amount
	// x = yes shares owned
	// n = pool no
	// y = pool yes
	// f = fee
	function getCloseOutSwapAmount(uint256 shareBalance, bool swapYes) external returns (uint256) {
		int256 n = swapYes ? int256(noBalance) : int256(yesBalance);
		int256 y = swapYes ? int256(yesBalance) : int256(noBalance);
		int256 x = int256(shareBalance);
		int256 f = int256(fee);
		int256 segment1 = (n * f) + (1000 * x) - (x * f) - (1000 * y) - (1000 * n);
		int256 segment2 = int256(sqrt(uint256((x*x*f*f) - (2000*x*x*f) + (1000000*x*x) - (2000000*n*x) - (2*n*x*f*f) + (4000*n*x*f) + (2000000*x*y) - (2000*x*f*y) + (1000000*n*n) + (n*n*f*f) - (2000*n*n*f) + (1000000*y*y) + (2000000*n*y) - (2000*n*f*y))));
		int256 solution = (segment1 + segment2) / int256((2 * (1000 - fee)));
		return uint256(solution);
	}

	// babylonian method (https://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Babylonian_method)
	function sqrt(uint y) private pure returns (uint z) {
		if (y > 3) {
			z = y;
			uint x = y / 2 + 1;
			while (x < z) {
				z = x;
				x = (y / x + x) / 2;
			}
		} else if (y != 0) {
			z = 1;
		}
	}
}
