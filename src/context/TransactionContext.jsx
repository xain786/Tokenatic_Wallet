import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { contractABI, contractAddress } from '../utils/constants';

export const TransactionContext = React.createContext();

const { ethereum } = window; // destructing ethereum from window.ethereum

const getEthereumContract = () => {
  const provider = new ethers.providers.Web3Provider(ethereum); //provider is read only
  const signer = provider.getSigner(); //it is read write used for contract interactions
  const transactionContract = new ethers.Contract(
    contractAddress,
    contractABI,
    signer
  );
  return transactionContract;
};

export const TransactionProvider = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState('');
  const [formData, setFormData] = useState({
    addressTo: '',
    amount: '',
    keyword: '',
    message: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [transactionCount, setTransactionCount] = useState('');
  const [transactions, setTransactions] = useState([]);

  const [tokenName, setTokenName] = useState('Token');
  const [tokenSymbol, setTokenSymbol] = useState('Tk');
  const [balance, setBalance] = useState(null);

  const handleChange = (e, filedName) => {
    setFormData((prevState) => ({ ...prevState, [filedName]: e.target.value }));
  };

  const getAllTransactions = async () => {
    try {
      if (!ethereum) return alert('Please Install metamask');
      const transactionContract = getEthereumContract();
      const availableTransactions =
        await transactionContract.getAllTransactions();

      const structuredTransactions = availableTransactions.map(
        (transaction) => ({
          addressTo: transaction.receiver,
          addressFrom: transaction.sender,
          timestamp: new Date(
            transaction.timestamp.toNumber() * 1000
          ).toLocaleString(),
          message: transaction.message,
          keyword: transaction.keyword,
          amount: parseInt(transaction.amount._hex) / 10 ** 18,
        })
      );
      console.log(structuredTransactions);

      setTransactions(structuredTransactions);
    } catch (error) {
      console.log(error);
      throw new Error('No Ethereum object.');
    }
  };

  const checkIfWalletIsConnected = async () => {
    try {
      if (!ethereum) return alert('Please Install metamask');
      const accounts = await ethereum.request({ method: 'eth_accounts' });

      if (accounts.length) {
        setCurrentAccount(accounts[0]);
        updateBalance(accounts[0]);
        updateTokenName();
        getAllTransactions();
        getTransactionCount();
      } else {
        console.log('No accounts found');
      }
      console.log(accounts);
    } catch (error) {
      console.log(error);
      throw new Error('No Ethereum object.');
    }
  };
  const getTransactionCount = async () => {
    try {
      if (!ethereum) return alert('Please Install metamask');
      const transactionContract = getEthereumContract();

      const transactionCount = await transactionContract.getTransactionCount();

      setTransactionCount(transactionCount.toNumber());
    } catch (error) {
      console.log(error);
      throw new Error('No Ethereum object.');
    }
  };
  const checkIfTransactionsExist = async () => {
    try {
      const transactionContract = getEthereumContract();
      const transactionCount = await transactionContract.getTransactionCount();

      window.localStorage.setItem('transactionCount', transactionCount);
    } catch (error) {
      console.log(error);
      throw new Error('No Ethereum object.');
    }
  };

  const connectWallet = async () => {
    try {
      if (!ethereum) return alert('Please Install metamask');
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });
      if (accounts.length) {
        setCurrentAccount(accounts[0]);
        updateBalance(accounts[0]);
        updateTokenName();
        getTransactionCount();
      } else {
        console.log('No accounts found connectWallet connectWallet');
      }
    } catch (error) {
      console.log(error);
      throw new Error('No Ethereum object.');
    }
  };

  const updateBalance = async (account) => {
    try {
      if (!ethereum) return alert('Please Install metamask');

      const transactionContract = getEthereumContract();

      let balanceBigN = await transactionContract.balanceOf(account);

      let balanceNumber = balanceBigN.toNumber();
      let tokenDecimals = await transactionContract.decimals();

      let tokenBalance = balanceNumber / Math.pow(10, tokenDecimals);

      setBalance(toFixed(tokenBalance));
    } catch (error) {
      console.log(error);
      throw new Error('No Ethereum object.');
    }
  };
  const updateTokenName = async () => {
    try {
      if (!ethereum) return alert('Please Install metamask');

      const transactionContract = getEthereumContract();
      setTokenName(await transactionContract.name());
      setTokenSymbol(await transactionContract.symbol());
    } catch (error) {
      console.log(error);
      throw new Error('No Ethereum object.');
    }
  };

  const sendTransaction = async () => {
    try {
      if (!ethereum) return alert('Please Install metamask');

      //get the data from the form..

      const { addressTo, amount, keyword, message } = formData;
      const transactionContract = getEthereumContract();
      // const parseAmount = ethers.utils.parseEther(amount); //convert decimal to Gwei Hexa decimal

      // await ethereum.request({
      //   method: 'eth_sendTransaction',
      //   params: [
      //     {
      //       from: currentAccount,
      //       to: addressTo,
      //       gas: '0x5208', //21000 Gwei gas
      //       value: parseAmount._hex, //
      //     },
      //   ],
      // });

      const txt = await transactionContract.transfer(addressTo, amount);
      setIsLoading(true);

      console.log(`Loading txt - ${txt.hash}`);
      await txt.wait();
      console.log(`Success txt- ${txt.hash}`);
      updateBalance(currentAccount);

      const transactionHash = await transactionContract.addToBlockChain(
        addressTo,
        amount,
        message,
        keyword
      );
      console.log(`Loading - ${transactionHash.hash}`);
      await transactionHash.wait();
      console.log(`Success - ${transactionHash.hash}`);
      setIsLoading(false);
      getTransactionCount();
      getAllTransactions();
    } catch (error) {
      console.log(error);
      throw new Error('No Ethereum object.');
    }
  };

  function toFixed(x) {
    if (Math.abs(x) < 1.0) {
      var e = parseInt(x.toString().split('e-')[1]);
      if (e) {
        x *= Math.pow(10, e - 1);
        x = '0.' + new Array(e).join('0') + x.toString().substring(2);
      }
    } else {
      var e = parseInt(x.toString().split('+')[1]);
      if (e > 20) {
        e -= 20;
        x /= Math.pow(10, e);
        x += new Array(e + 1).join('0');
      }
    }
    return x;
  }
  const chainChangedHandler = () => {
    // reload the page to avoid any errors with chain change mid use of application
    window.location.reload();
  };
  const accountChangeHandler = (newAccount) => {
    setCurrentAccount(newAccount[0]);
    updateBalance(newAccount[0].toString());
  };
  // listen for account changes
  ethereum.on('accountsChanged', accountChangeHandler);
  ethereum.on('chainChanged', chainChangedHandler);

  //useEffect run for first at start of application and then any time we put in the square brackets changes
  useEffect(() => {
    checkIfWalletIsConnected();
    checkIfTransactionsExist();
  }, []);

  return (
    //we have to write connectWallet: connectWallet but as key and value
    //both are same we can only provide key
    <TransactionContext.Provider
      value={{
        connectWallet,
        currentAccount,
        formData,
        setFormData,
        handleChange,
        sendTransaction,
        isLoading,
        transactions,
        balance,
        tokenName,
        transactionCount,
        tokenSymbol,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};
