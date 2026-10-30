// Public Firebase web configuration. Never expose the service account or presenter key.
export default function handler(req,res) {
  res.setHeader('Cache-Control','no-store, private');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  const e=process.env;
  const enabled=Boolean(e.FIREBASE_PROJECT_ID && e.FIREBASE_API_KEY &&
    e.FIREBASE_APP_ID && e.FIREBASE_SERVICE_ACCOUNT_JSON);
  if(!enabled) return res.status(200).json({enabled:false});
  return res.status(200).json({enabled:true,config:{
    apiKey:e.FIREBASE_API_KEY,authDomain:e.FIREBASE_AUTH_DOMAIN || e.FIREBASE_PROJECT_ID+'.firebaseapp.com',
    projectId:e.FIREBASE_PROJECT_ID,appId:e.FIREBASE_APP_ID,
    messagingSenderId:e.FIREBASE_MESSAGING_SENDER_ID || undefined
  },collection:'unfoldLive',document:'main'});
}
