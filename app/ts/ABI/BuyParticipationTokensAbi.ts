export const BUY_PARTICIPATION_TOKENS_ABI = [
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_attotokens",
				"type": "uint256"
			}
		],
		"name": "buyParticipationTokens",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	}
] as const
