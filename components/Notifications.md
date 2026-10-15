//multiple notifications stack at footer
import{useState, useEffect} from 'react';
import './styles.css';

function Notification({notification, deleteNotification}) {
  return (
    <li className="notifications-list-item">{notification.text}
      <button onClick={() => deleteNotification(notification.id)}>X </button>
    </li>
  )
}

function Notifications({notifications, setNotifications}) {

  const deleteNotification = (id) => {      
      setNotifications(prev => prev.filter(x => x.id !== id));
  }

  return (
    <ul className="notification-list">
      {
        notifications.map(item => (
          <Notification key={item.id} notification={item} deleteNotification={deleteNotification}/>
        ))
      }
    </ul>
  )
}

export default function App() {
  const [notifications, setNotifications] = useState([]);

   function setCurrentNotification(text) {
         const notification = {id: Date.now(), text};
         setNotifications(prev => { 
                const next = [...prev, notification];              
                console.log("length " + next.length); 
                return next.length > 10 ? next.slice(-10) : next;
          });
     }

   useEffect(() => {    
    //  const timer = setInterval(() => {      
    //     setCurrentNotification("Notification " + Math.random().toFixed(2));
    //  },1000)

    //  return () => {
    //   clearInterval(timer);
    //  }
  }, [])   

   return <Notifications notifications= {notifications} setNotifications={setNotifications}/>
}

*{
  padding:0;
  margin:0;
  box-sizing: border-box;
}

.notifications-list-item {
  height: 2rem;
  display:flex;
  justify-content: space-between;
  border:2px solid green;
  background-color: white;
  align-items: center;
  padding: 20px;
}

button {
   border:none;
   cursor:pointer;
   background:transparent;
}

.notification-list {
   position: fixed;
   bottom: 0;
   margin:1rem;
   list-style:none;
   display: flex;
   flex-direction: column-reverse;
   width:100%;
   gap:10px;
}

