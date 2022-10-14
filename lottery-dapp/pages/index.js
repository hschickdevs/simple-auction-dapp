import { useState, useEffect } from 'react'
import Head from 'next/head'
import Web3 from 'web3'
import auctionABI from '../blockchain/auctionABI'
import styles from '../styles/Home.module.css'
import 'bulma/css/bulma.css'

export default function Home() {
  const [web3, setWeb3] = useState(null)
  const [address, setAddress] = useState()
  const [auctionContract, setAuctionContract] = useState(null)
  const [auctionAddress, setAuctionAddress] = useState()
  const [bidAmount, setBidAmount] = useState(0) // Should be stored as wei
  const [highestBid, setHighestBid] = useState(0)
  const [auctionBidders, setAuctionBidders] = useState([])
  const [claimableBalance, setClaimableBalance] = useState(0)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [beneficiary, setBeneficiary] = useState('')
  const [auctionStartTime, setAuctionStart] = useState(null)
  const [auctionEndTime, setAuctionEnd] = useState(null)

  // Old lottery variables
  const [lotteryPot, setLotteryPot] = useState()
  const [lotteryPlayers, setPlayers] = useState([])
  const [lotteryHistory, setLotteryHistory] = useState([])
  const [lotteryId, setLotteryId] = useState()

  useEffect(() => {
    updateState();
    // const id = setInterval(() => {
    //   callApi()
    //   setCheck(check + 1)
    // }, 3000);
    // return () => clearInterval(id);
  }, [auctionContract])

  const getAuctionContract = async () => {
    if (! web3) {
      alert ('Please connect a wallet.')
      return
    }
    try {
      const contract = new web3.eth.Contract(
          auctionABI,
          auctionAddress
      )
      // Verify that the contract is valid
      await contract.methods.treasury().call()

      // If treasury method is successful, contract is valid.
      setAuctionContract(contract)
      setBeneficiary(await contract.methods.beneficiary().call())
      setAuctionStart(await contract.methods.auctionStartTime().call())
      setAuctionEnd(await contract.methods.auctionEndTime().call())
    } catch (e) {
      alert ('Invalid contract address.')
      return
    }
  }

  const updateAuctionAddress = event => {
    setAuctionAddress(event.target.value)
  }

  const updateState = () => {
    if (auctionContract) getHighestBid()
    if (auctionContract) getBidders()
    if (auctionContract) getClaimableBalance()
  }

  const checkAuctionEnded = async () => {
    const _auctionEndTime = await auctionContract.methods.auctionEndTime().call()
    if (Date.now() <= _auctionEndTime * 1000) {
      return false;
    } else {
      return true;
    }
  }

  const refreshStats = async () => {
    if (! auctionContract) {
      alert('Please set an auction contract address.')
      return
    }
    updateState()
    console.log(auctionEndTime * 1000)
    console.log(Date.now())
    // IMPORTANT: This is a hack to get around the fact that I can't live update the window
  }


  // const getPot = async () => {
  //   const pot = await lcContract.methods.getBalance().call()
  //   setLotteryPot(web3.utils.fromWei(pot, 'ether'))
  // }

  // const getPlayers = async () => {
  //   const players = await lcContract.methods.getPlayers().call()
  //   setPlayers(players)
  // }
  const getBidders = async () => {
    const bidders = await auctionContract.methods.getBidders().call()
    setAuctionBidders(bidders)
  }

  // const getHistory = async (id) => {
  //   setLotteryHistory([])
  //   for (let i = parseInt(id); i > 0; i--) {
  //     const winnerAddress = await lcContract.methods.lotteryHistory(i).call()
  //     const historyObj = {}
  //     historyObj.id = i
  //     historyObj.address = winnerAddress
  //     setLotteryHistory(lotteryHistory => [...lotteryHistory, historyObj])
  //   }
  // }

  const updateBidAmt = event => {
    if (web3) {
      setBidAmount(Math.round(event.target.value * 1e18))
    }
  }
  
  const getHighestBid = async () => {
    const _highestBid = await auctionContract.methods.highestBid().call()
    setHighestBid(_highestBid)
  }

  const getClaimableBalance = async () => {
    const _claimableBalance = await auctionContract.methods.treasuryBalances(address).call()
    setClaimableBalance(_claimableBalance)
  }

  const enterLotteryHandler = async () => {
    setError('')
    setSuccessMsg('')
    try {
      await lcContract.methods.enter().send({
        from: address,
        value: '15000000000000000',
        gas: 300000,
        gasPrice: null
      })
      updateState()
    } catch(err) {
      setError(err.message)
    }
  }
  const placeBidHandler = async () => {
    setError('')
    setSuccessMsg('')
    if (! auctionContract) {
      alert('Please set an auction address.')
      return
    }
    if (checkAuctionEnded()) {
      if (await auctionContract.methods.ended().call()) {
        setError('Auction has ended - bids are finalized & winner has been drawn.')
        return
      } else {
        setError('Auction has ended - bids are finalized. End Auction to draw the winner.')
        return
      }
    }
    try {
      await auctionContract.methods.bid().send({
        from: address,
        value: bidAmount,
        // gas: 300000,
        // gasPrice: null
      })
      updateState()
    } catch(err) {
      setError(err.message)
    }
  }

  const pickWinnerHandler = async () => {
    setError('')
    setSuccessMsg('')
    console.log(`address from pick winner :: ${address}`)
    try {
      await lcContract.methods.pickWinner().send({
        from: address,
        gas: 300000,
        gasPrice: null
      })
    } catch(err) {
      setError(err.message)
    }
  }
  const claimBalanceHandler = async () => {
    setError('')
    setSuccessMsg('')
    if (! auctionContract) {
      alert('Please set an auction address.')
      return
    }
    if (await auctionContract.methods.treasuryBalances(address).call() == 0) {
      setError('You have no balance to claim.')
      return
    }
    if (! await auctionContract.methods.ended().call()) {
      setError('Auction has not been ended yet - Auction must be ended to claim balance.')
      return
    }
    try {
      claimedBalance = await auctionContract.methods.claimBalance().send({
        from: address,
      })
      setSuccessMsg(`${web3.utils.fromWei(claimedBalance, 'ether')} ETH in balance claimed.`)
    } catch(err) {
      setError(err.message)
    }
  }

  const endAuctionHandler = async () => {
    setError('')
    setSuccessMsg('')
    if (! auctionContract) {
      alert('Please set an auction address.')
      return
    }
    if (await auctionContract.methods.ended().call()) {
      setError('Auction has already ended.')
      return
    }
    try {
      await auctionContract.methods.auctionEnd().send({
        from: address,
      })
      updateState()
      setSuccessMsg('Auction has been ended.')
    } catch(err) {
      setError(err.message)
    }
  }


  const restartAuction = async () => {
    setError('')
    setSuccessMsg('')
    if (! auctionContract) {
      alert('Please set an auction address.')
      return
    }
    if (address !== beneficiary) {
      alert('Only the beneficiary can restart the auction.')
      return
    }
    if (! await auctionContract.methods.ended().call()) {
      setError('Auction has not yet ended - End the first auction before resetting..')
      return
    }
    try {
      await auctionContract.methods._reset().send({
        from: address,

      })
      setAuctionStart(await contract.methods.auctionStartTime().call())
      setAuctionEnd(await contract.methods.auctionEndTime().call())
      setSuccessMsg('Auction has been reset.')
    } catch(err) {
      setError(err.message)
    }
  }

  const payWinnerHandler = async () => {
    setError('')
    setSuccessMsg('')
    try {
      await lcContract.methods.payWinner().send({
        from: address,
        gas: 300000,
        gasPrice: null
      })
      console.log(`lottery id :: ${lotteryId}`)
      const winnerAddress = await lcContract.methods.lotteryHistory(lotteryId).call()
      setSuccessMsg(`The winner is ${winnerAddress}`)
      updateState()
    } catch(err) {
      setError(err.message)
    }
  }

  const connectWalletHandler = async () => {
    setError('')
    setSuccessMsg('')
    /* check if MetaMask is installed */
    if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
      try {
        /* request wallet connection */
        await window.ethereum.request({ method: "eth_requestAccounts"})
        /* create web3 instance & set to state */
        const web3 = new Web3(window.ethereum)
        /* set web3 instance in React state */
        setWeb3(web3)
        /* get list of accounts */
        const accounts = await web3.eth.getAccounts()
        /* set account 1 to React state */
        setAddress(accounts[0])

        /* create local contract copy */
        // const lc = lotteryContract(web3)
        // setLcContract(lc)

        window.ethereum.on('accountsChanged', async () => {
          const accounts = await web3.eth.getAccounts()
          console.log(accounts[0])
          /* set account 1 to React state */
          setAddress(accounts[0])
        })
        setSuccessMsg('Wallet connected as ' + accounts[0])
      } catch(err) {
        setError(err.message)
      }
    } else {
      /* MetaMask is not installed */
      console.log("Please install MetaMask")
    }
  }

  const currentAuctionStatus = () => {
    if (! auctionContract) {
      return ('No Auction Set')
    }
    if (Date.now() >= (auctionEndTime * 1000)) {
      return ('Auction Bidding Closed')
    }

    return ("Ends: " + new Date(auctionEndTime * 1000).toLocaleString())
  }

  return (
    <div>
      <Head>
        <title>Görli Ether Auction</title>
        <meta name="description" content="An Ethereum Auction dApp" />
        <link rel="icon" href="./favicon.ico" type="image/png" />
      </Head>

      <main className={styles.main}>
        <nav className="navbar mt-4 mb-4">
          <div className="container">
            <div className="navbar-brand">
              <h1>Görli Ether Auction</h1>
            </div>
            <div className="navbar-end">
              <button onClick={connectWalletHandler} className="button is-link">Connect Wallet</button>
            </div>
          </div>
        </nav>
        <div className="container">
          <section className="mt-5">
            <div className="columns">
              <div className="column is-two-thirds">
                <section className="mt-5">
                  <p>Set Auction Address</p>
                  <div className='control'>
                    <input onChange={updateAuctionAddress} className='input' type='text' placeholder='Enter Auction Contract Address...'/>
                  </div>
                  <button onClick={getAuctionContract} className="button is-warning is-large is-light mt-3">Set Auction</button>
                </section>
                <section className="mt-5">
                  <p>Place the Highest Bid</p>
                  <div className='control'>
                    <input onChange={updateBidAmt} className='input' type='number' placeholder='Enter amount (in ETH)...'/>
                  </div>
                  <button onClick={placeBidHandler} className="button is-primary is-large is-light mt-3">Place Bid</button>
                </section>
                <section className="mt-6">
                  <p>Claim Treasury Balance</p>
                  <button onClick={claimBalanceHandler} className="button is-info is-large is-light mt-3">Claim Balance</button>
                </section>
                <section className="mt-6">
                  <p>End the Auction</p>
                  <button onClick={endAuctionHandler} className="button is-danger is-large is-light mt-3">End Auction</button>
                </section>
                <section className="mt-6">
                  <p><b>Admin only:</b> Restart Auction</p>
                  <button onClick={restartAuction} className="button is-danger is-large is-light mt-3">Restart Auction</button>
                </section>
                <section>
                  <div className="container has-text-danger mt-6">
                    <p><b>{error}</b></p>
                  </div>
                </section>
                <section>
                  <div className="container has-text-success mt-6">
                    <p>{successMsg}</p>
                  </div>
                </section>
              </div>
              <div className={`${styles.lotteryinfo} column is-one-third`}>
                <section className="mt-5">
                  <div className="card">
                    <div className="card-content">
                      <div className="content">
                        <h2><a href={`https://goerli.etherscan.io/address/${auctionAddress}`}>Current Auction</a></h2>
                        <p>{currentAuctionStatus()}</p>
                      </div>
                    </div>
                  </div>
                </section>
                <section className="mt-5">
                  <div className="card">
                    <div className="card-content">
                      <div className="content">
                        <h2><a href={`https://goerli.etherscan.io/address/${beneficiary}`}>Beneficiary</a></h2>
                      </div>
                    </div>
                  </div>
                </section>
                <section className="mt-5">
                  <div className="card">
                    <div className="card-content">
                      <div className="content">
                        <h2>Highest Bid</h2>
                        <p>{highestBid / 1e18} ETH</p>
                      </div>
                    </div>
                  </div>
                </section>
                <section className="mt-5">
                  <div className="card">
                    <div className="card-content">
                      <div className="content">
                        <h2>Claimable Balance</h2>
                        <p>{claimableBalance / 1e18} Ether</p>
                      </div>
                    </div>
                  </div>
                </section>
                <section className="mt-5">
                  <div className="card">
                    <div className="card-content">
                      <div className="content">
                        <h2>Bidders ({auctionBidders.length})</h2>
                        <ul className="ml-0">
                          {
                            (auctionBidders && auctionBidders.length > 0) && auctionBidders.map((bidder, index) => {
                              return <li key={`${bidder}-${index}`}>
                                <a href={`https://etherscan.io/address/${bidder}`}>
                                  {bidder}
                                </a>
                              </li>
                            })
                          }
                        </ul>
                      </div>
                    </div>
                  </div>
                </section>
                <section className="mt-2">
                  <button onClick={refreshStats} className="button is-primary is-large is-dark mt-3 ">Refresh Auction Stats</button>
                </section>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>&copy; 2022 Block Explorer</p>
      </footer>
    </div>
  )
}
