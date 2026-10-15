import {useState, useEffect} from 'react';
import './styles.css'

function UserDetails() {
 const [users, setUsers] = useState([]);
 const [error, setError] = useState("");
 const [loading, setLoading] = useState(false);

  const url = "https://jsonplaceholder.typicode.com/posts";

   useEffect(() => {
      async function getUserDetails() {
          try {
           setError("");
           setLoading(true);

           const response =  await fetch(url);

           if(response.ok) {
             const data =   await response.json();
             console.log(data)
             setUsers(data);
           }
          } catch(ex) {
              setError(ex.message);
              setUsers([]);
          } finally {
            setLoading(false);
          }

      }
      getUserDetails();   
   }, []);

 const keys = users.length > 0 ? Object.keys(users[0]) : [];
    
   return (
       <table className="table-container">
                <thead>
                    <tr>
                    { keys.map(key => <th>{key}</th>) }
                    </tr>
                </thead>
                 <tbody>
                      {             
                         users.map(user => (
                              <tr key={user.id}>
                                 { keys.map(k => <td key={k}>{user[k]}</td>)}
                              </tr>   
                      ))}
                 </tbody>
       </table>
   )
}

export default function App() {
   return <UserDetails />
}
