process.env.HARDHAT_NETWORK = process.env.HARDHAT_NETWORK || "celo";

require("dotenv").config();
const { run } = require("hardhat");

async function main() {
  const address = process.argv[2];
  if (!address) {
    console.error("Usage: node scripts/verify-game-access-celo.cjs <CONTRACT_ADDRESS>");
    process.exit(1);
  }

  console.log("Verifying GameAccess at", address, "on CeloScan...\n");

  try {
    await run("verify:verify", {
      address,
      constructorArguments: [],
      network: "celo",
    });
    console.log("\nVerified. View: https://celoscan.io/address/" + address);
  } catch (err) {
    if (
      err.message &&
      (err.message.includes("Already Verified") || err.message.includes("already verified"))
    ) {
      console.log("Contract is already verified.");
    } else {
      console.error("Verification failed:", err.message);
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
