import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAe0VO-L_6rVk342Vev3H4pviA4LdNGE1o",
  authDomain: "accord-ems.firebaseapp.com",
  projectId: "accord-ems",
  storageBucket: "accord-ems.firebasestorage.app",
  messagingSenderId: "941893413878",
  appId: "1:941893413878:web:6cd78af4bdc9cadff9b5d7",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function getCreds() {
    const q = query(collection(db, 'employees'), limit(5));
    const qs = await getDocs(q);
    qs.forEach(doc => {
        const data = doc.data();
        console.log(`EmpNo: ${data.employeeNo}, Email: ${data.email}, Password: ${data.password}, Role: ${data.role}, Name: ${data.name}`);
    });
    process.exit(0);
}
getCreds();
