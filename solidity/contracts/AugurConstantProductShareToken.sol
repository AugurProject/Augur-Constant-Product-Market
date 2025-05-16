pragma solidity 0.8.29;

import { IERC20 } from "./IERC20.sol";
import { ERC1155 } from "./ERC1155.sol";
import { Constants } from "./Constants.sol";
import { TokenId } from "./TokenId.sol";
import { IOICash } from "./IOICash.sol";

contract AugurConstantProductShareToken is ERC1155 {

	IERC20 public dai = IERC20(Constants.DAI_ADDRESS);
	IOICash public constant cash = IOICash(Constants.AUGUR_OICASH);
	uint256 public constant numTicks = 1000;

	constructor() {
		dai.approve(Constants.AUGUR_ADDRESS, 2**256-1);
	}

	function buyCompleteSets(address acpm, address account, uint256 setsToBuy) external {
		uint256 amountInDai = setsToBuy * numTicks;
		dai.transferFrom(msg.sender, address(this), amountInDai);
		cash.deposit(amountInDai);

		uint256[] memory tokenIds = new uint256[](3);
        uint256[] memory values = new uint256[](3);

		tokenIds[0] = TokenId.getTokenId(acpm, 0);
		tokenIds[1] = TokenId.getTokenId(acpm, 1);
		tokenIds[2] = TokenId.getTokenId(acpm, 2);
		values[0] = setsToBuy;
		values[1] = setsToBuy;
		values[2] = setsToBuy;

		_mintBatch(account, tokenIds, values, bytes(""), false);
	}

	function sellCompleteSets(address acpm, address holder, address recipient, uint256 setsToSell) external {
		require(holder == msg.sender || isApprovedForAll(holder, msg.sender) == true, "ERC1155: need operator approval to sell complete sets");

		uint256[] memory tokenIds = new uint256[](3);
        uint256[] memory values = new uint256[](3);

		tokenIds[0] = TokenId.getTokenId(acpm, 0);
		tokenIds[1] = TokenId.getTokenId(acpm, 1);
		tokenIds[2] = TokenId.getTokenId(acpm, 2);
		values[0] = setsToSell;
		values[1] = setsToSell;
		values[2] = setsToSell;

		_burnBatch(holder, tokenIds, values, bytes(""), false);

		cash.withdraw(setsToSell * numTicks);
		dai.transfer(recipient, dai.balanceOf(address(this)));
	}

	function unsafeTransferFrom(address _from, address _to, uint256 _id, uint256 _value) public {
        _transferFrom(_from, _to, _id, _value, bytes(""), false);
    }

	function unsafeBatchTransferFrom(address _from, address _to, uint256[] memory _ids, uint256[] memory _values) public {
        _batchTransferFrom(_from, _to, _ids, _values, bytes(""), false);
    }

	function onBurn(uint256 _tokenId, address _target, uint256 _amount) internal override {}
	function onMint(uint256 _tokenId, address _target, uint256 _amount) internal override {}
	function onTokenTransfer(uint256 _tokenId, address _from, address _to, uint256 _value) internal override {}
}
