
//Quesions - Address book
//1, What will happen when i click on ship to address button - console.log
//2. IS thee any particular format of api, or is it constant in FE, or data coming 
//from API and for sake of this problem, can i mock the data , and do i need to create api strcuture?
//3. IS there any data that is coming as part of intial load,meaning is it Server side rendered?
//4. is the 5 adddresses fixed on page?
//5. what will happen when i click on previous and next , will it tranverse in circular format or shall i disable the button?
// 6. DO i need to consider accessibility or internalization as well while developing this ?
import {useState, useEffect} from 'react';
import './styles.css';

//api format 
const apiData = {
  "addresses": [
      {
      "id": 1,
      "name": "tewqeqwst",
      "streetAddress": "201 belltown",
      "city": "Seattle",
      "country":"USA",
      "pincode": 98121
  },
      {
      "id": 2,
      "name": "tewqeqst",
      "streetAddress": "201 belltown",
      "city": "Seattle",
      "country":"USA",
      "pincode": 98121
  },{
      "id": 3,
      "name": "wqe",
      "streetAddress": "201 belltown",
      "city": "Seattle",
      "country":"USA",
      "pincode": 98121
  },{
      "id": 4,
      "name": "teqqwest",
      "streetAddress": "201 belltown",
      "city": "Seattle",
      "country":"USA",
      "pincode": 98121
  },{
      "id": 5,
      "name": "tewqqst",
      "streetAddress": "201 belltown",
      "city": "Seattle",
      "country":"USA",
      "pincode": 98121
  }],
  "hasNextPage": true //whether there are more addresses
}

//Decomposition
//1. App, 
//2 AddressContainer 
//3 Address


function Address({id, name, streetAddress, city, country, pincode , onShipToAddressClick, selectedAddressId}) {
   
  return (
     <section className={selectedAddressId ===id ? "address-block selected" : "address-block"}>
          <p>{name}</p>
          <p>{streetAddress}</p>
          <p>{city} , {country} , {pincode}</p>
          <button className="ship-to-address-btn btn" onClick={() => onShipToAddressClick(id)}>Ship to Address</button>
     </section>
  )
}

function AddressContainer() {
    const [addresses, setAddresses] = useState([]);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [selectedAddressId, setSelectedAddressId] = useState(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    
     
     useEffect(() => {       
        async function fetchAddress() {
          try {
        //  setLoading(true);
          setError("");

        //  const response =  await fetch(`api/v1/${page}`);
           // if(response.ok) {
           //   const data = await response.json();
              const data = apiData;
              console.log(data);
             setAddresses(data.addresses);
             setHasNextPage(data.hasNextPage);
         //  }
          } catch(ex) {
             setError(ex.message);            
          } finally {
             setLoading(false);
          }
        }
        fetchAddress(1);
     }, [page]);

     const onPreviousBtnClick = () => {
        setPage(page => page - 1 );
     }

     const onNextBtnClick = () => {
        setPage(page => page + 1 );
     }

    const onShipToAddressClick = (id) => {
         setSelectedAddressId(id);
    }
     
    if(loading) {
       return <div>Loading...</div>
    }

     return (
       <><section className="address-container">
             <button className="previous-btn btn" onClick={onPreviousBtnClick} disabled={page < 1}> {"<<"} </button>
             {addresses.map(address => <Address key={address.id} {...address} onShipToAddressClick={onShipToAddressClick} selectedAddressId={selectedAddressId} />
             )}
             {error && <p>{error}</p>}
             <button className="next-btn btn" onClick={onNextBtnClick} disabled={!hasNextPage}> {">>"} </button>
         </section>
          <p aria-live="polite">
                 {selectedAddressId ? `Selected Address Id: ${selectedAddressId}` : "No address selected"}
         </p>
        </>
     )
}

export default function App() {
  return <AddressContainer/>
}