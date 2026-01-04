import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

export const runtime = 'nodejs';

// Contract addresses for the 3 QT distributor contracts
const CONTRACTS = [
  {
    name: 'SpinWheelQTDistributor',
    address: '0x3D59700B5EBb9bDdA7D5b16eD3A77315cF1B0e2B',
  },
  {
    name: 'DailyRewardDistributor',
    address: '0xbC9e7dE46aA15eA26ba88aD87B76f6fa2EcCD4eD',
  },
  {
    name: 'QTRewardDistributor',
    address: '0xB0EfA92d9Da5920905F69581bAC223C3bf7E44F5',
  },
];

const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS || '0x361faAea711B20caF59726e5f478D745C187cB07';
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

/**
 * Fetch QT token balance for a contract address
 */
async function getContractQTBalance(contractAddress: string): Promise<number> {
  try {
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    
    // ERC20 token contract ABI (minimal - just balanceOf)
    const tokenAbi = ['function balanceOf(address owner) view returns (uint256)'];
    const tokenContract = new ethers.Contract(QT_TOKEN_ADDRESS, tokenAbi, provider);

    const balance = await tokenContract.balanceOf(contractAddress);
    // QT token has 18 decimals
    return parseFloat(ethers.formatUnits(balance, 18));
  } catch (error) {
    console.error(`Error fetching balance for ${contractAddress}:`, error);
    return 0;
  }
}

/**
 * GET /api/contracts/qt-balances
 * Returns QT token balances for all 3 distributor contracts
 */
export async function GET(req: NextRequest) {
  try {
    const balances = await Promise.all(
      CONTRACTS.map(async (contract) => {
        const balance = await getContractQTBalance(contract.address);
        return {
          name: contract.name,
          address: contract.address,
          balance: balance,
          balanceFormatted: balance.toLocaleString('en-US', {
            maximumFractionDigits: 2,
          }),
        };
      })
    );

    // Calculate total balance
    const totalBalance = balances.reduce((sum, contract) => sum + contract.balance, 0);

    return NextResponse.json({
      success: true,
      contracts: balances,
      total: {
        balance: totalBalance,
        balanceFormatted: totalBalance.toLocaleString('en-US', {
          maximumFractionDigits: 2,
        }),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching contract balances:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch contract balances',
      },
      { status: 500 }
    );
  }
}

