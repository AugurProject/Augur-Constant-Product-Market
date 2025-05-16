pragma solidity 0.8.29;

import { IERC1155 } from "./IERC1155.sol";


interface IAugurConstantProductShareToken is IERC1155 {
	function buyCompleteSets(address acpm, address account, uint256 setsToBuy) external;
	function sellCompleteSets(address acpm, address holder, address recipient, uint256 setsToSell) external;
	function unsafeTransferFrom(address _from, address _to, uint256 _id, uint256 _value) external;
	function unsafeBatchTransferFrom(address _from, address _to, uint256[] memory _ids, uint256[] memory _values) external;
}
