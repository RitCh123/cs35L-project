import React, { useState } from 'react';
import { useAuth } from '../firebase/AuthContext';
import { useNavigate } from 'react-router-dom';

import { Button, Card, HeroUIProvider } from '@heroui/react'
import { FcGoogle } from "react-icons/fc"
import { Spacer, Divider } from '@heroui/react';
import { Alert } from "@heroui/react";



const GoogleIcon = (props) => {
  return <FcGoogle {...props} />;
}


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, googleSignIn } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (error) {
      setError('Failed to sign in: ' + error.message);
    }
    setLoading(false);
  }

  async function handleGoogleSignIn() {
    try {
      setError('');
      setLoading(true);
      await googleSignIn();
      navigate('/');
    } catch (error) {
      setError('Failed to sign in with Google: ' + error.message);
    }
    setLoading(false);
  }


  return (
    <>
    <HeroUIProvider>
      <div className="w-full flex items-center my-3" style={{width: '99vw', padding: '2rem', margin: 'auto'}}>
            {error != '' ? <Alert color="danger" title={`Error. ${error}`} />: null}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <p className="text-2xl"><strong>Sign in with Google</strong></p>
        <Spacer y={4} />
        <p>Only UCLA students (people who have email addresses ending with @g.ucla.edu or @ucla.edu) are allowed to access the game reservation system.</p>
        <Spacer y={4} />
        <Divider style={{width: "90%"}} />
        <Spacer y={4} />
        <div>
          <Button color="primary" startContent={<GoogleIcon />} variant="ghost" onClick={handleGoogleSignIn} style={{width: "35vw"}}>
            Sign in with Google
          </Button>
        </div>
      </div>
    </HeroUIProvider>
    </>
  )
} 