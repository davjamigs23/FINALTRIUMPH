
import { db } from './src/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

async function clearAuditLogs() {
  const logsRef = collection(db, 'audit_logs');
  const snapshot = await getDocs(logsRef);
  
  console.log(`Deleting ${snapshot.size} audit logs...`);
  
  const deletePromises = snapshot.docs.map(logDoc => deleteDoc(doc(db, 'audit_logs', logDoc.id)));
  await Promise.all(deletePromises);
  
  console.log('Audit logs cleared.');
}

clearAuditLogs().catch(console.error);
