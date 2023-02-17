const ethWallet = require('ethereumjs-wallet').default;
const ethers = require('ethers')
let network = 'mainnet'
let bitcoin = require('bitcoinjs-lib')
let buffer = require('buffer')
const bitcoinNetwork = bitcoin.networks.testnet;

let rootUrl = "https://api.blockcypher.com/v1/btc/test3"


const generateEthWallet = () => {
  let addressData = ethWallet.generate()

  return { privateKey: addressData.getPrivateKeyString(), address: addressData.getAddressString()  }
}

const sendEth =  (fromPrivateKey, toAddress, amount) => {
  let provider = ethers.getDefaultProvider(network)
  let wallet = new ethers.Wallet(fromPrivateKey, provider)
  let receiverAddress = toAddress;
  let amountInEther = amount;

  let tx = {
    to: receiverAddress,
    value: ethers.utils.parseEther(amountInEther)
  }

  wallet.sendTransaction(tx)
  .then((txObj) => {
      console.log('txHash', txObj.hash)
  })
}



module.exports = {
  generateEthWallet
}


