pragma solidity 0.8.29;

import { IERC20 } from "./IERC20.sol";

interface IAugurConstantProduct is IERC20 {
	function INVALID() external view returns (uint256);
	function NO() external view returns (uint256);
	function YES() external view returns (uint256);
	function augurMarketAddress() external view returns (address);
	function fee() external view returns (uint256);
	function noBalance() external view returns (uint256);
	function yesBalance() external view returns (uint256);
	function getNoYesBalances() external view returns (uint256, uint256);
	function noYesShareBalances(address owner) external view returns (uint256 no, uint256 yes);
	function shareBalances(address owner) external view returns (uint256, uint256, uint256);
	function mint(address mintTo) external;
	function burn(address sharesTo) external returns (uint256 noShare, uint256 yesShare);
	function swap(address to, uint256 noSharesOut, uint256 yesSharesOut) external;
}
