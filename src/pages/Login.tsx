
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { ShieldCheck, Timer } from 'lucide-react';

const Login = () => {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (login(accessCode)) {
      toast({
        title: "Access Granted",
        description: "Welcome to ADSONS Attendance Manager"
      });
      navigate('/');
    } else {
      setError('Invalid access code');
      toast({
        title: "Access Denied",
        description: "The access code you entered is incorrect",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">ADSONS Attendance Manager</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Access Code
                </label>
                <Input 
                  id="accessCode"
                  type="password"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className={error ? "border-red-500" : ""}
                  placeholder="Enter access code"
                  required
                />
                {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4 pt-2 border-t">
                <Timer className="h-4 w-4" />
                <p>For security, you will be automatically logged out after 2 minutes of inactivity.</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              Access System
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Login;
