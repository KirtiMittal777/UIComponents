import {useState} from 'react';
import './styles.css';

//accordion
const accordionData = [
  {id: 1, title: "Accordion 1" ,body: "Accordion 1 body"},
  {id: 2, title: "Accordion 2" ,body: "Accordion 2 body"},
  {id: 3, title: "Accordion 3" ,body: "Accordion 3 body"},
  {id: 4, title: "Accordion 4" ,body: "Accordion 4 body"},
  {id: 5, title: "Accordion 5" ,body: "Accordion 5 body"}
]


function AccordionItem({item, expandAll, setExpandAll}) {
   const [open, setOpen] = useState(false);

   const setOpenClose = () => {
      if(expandAll) {
        setExpandAll(false);
      }
      setOpen(open => !open);
   }
  
  return (
    <div className="accordion-item" onClick={() => setOpenClose()}>
      <div className="accordion-header" >{item.title}</div>
     { (open || expandAll) && <div className="accordion-body">{item.body}</div>}
    </div>
  )
}

function Accordion({data, expandAll, setExpandAll}) {

  return (
    <section className="accordion-container">
     { data.map(item => (
       <AccordionItem 
       expandAll = {expandAll}
       item ={item} 
       key={item.id} 
      setExpandAll={setExpandAll}
       
       />
     ))
     }
    </section>
  )
}

export default function App() {
  const [expandAll, setExpandAll] = useState(true);
      
    return (
       <>
     
       <button onClick={() => setExpandAll(expandAll => !expandAll)}>Expand All</button>
        <Accordion 
         expandAll={expandAll}
         data={accordionData} 
         setExpandAll={setExpandAll}
          style={{
            marginTop: "20px",
            paddingTop:"20px"
          }} 
          />
       </>
      )
}

.accordion-item {
  padding: 5px;
  border:1px solid black;
  background-color: aliceblue;
   
}
.accordion-header {
   cursor: pointer;
   height: 30px;
}
.accordion-body {
   margin-top:10px;
}

.accordion-container {
   display:flex;
   flex-direction: column;
   gap:10px;
   
}
