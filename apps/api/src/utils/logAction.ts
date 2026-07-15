// import { ref, push } from 'firebase/database';
// import { db } from '../db/firebase';

// export const logActionToDb = async (action: any) => {
//   try {
//     const actionRef = ref(db, 'user_actions');
//     await push(actionRef, action);
//     console.log('Action logged to DB:', action);
//   } catch (error) {
//     console.error('Error logging action to DB:', error);
//   }
// };