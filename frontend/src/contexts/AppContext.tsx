import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  age_range?: string;
  gender?: string;
}

interface UserProfile {
  age_range: string;
  gender: string;
}

interface ScreeningResult {
  id: string;
  indice_iobio: number;
  area_scores: { [key: string]: number };
  weak_areas: string[];
  date: string;
}

interface AppContextType {
  user: User | null;
  isGuest: boolean;
  hasCompletedOnboarding: boolean;
  screeningResult: ScreeningResult | null;
  isBootstrapped: boolean;
  userProfile: UserProfile | null;
  setUser: (user: User | null) => void;
  setIsGuest: (isGuest: boolean) => void;
  setHasCompletedOnboarding: (completed: boolean) => void;
  setScreeningResult: (result: ScreeningResult | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(false);
  const [screeningResult, setScreeningResult] = useState<ScreeningResult | null>(null);
  const [isBootstrapped, setIsBootstrapped] = useState<boolean>(false);
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);

  // Load saved data on mount
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('user');
      const savedIsGuest = await AsyncStorage.getItem('isGuest');
      const savedOnboarding = await AsyncStorage.getItem('hasCompletedOnboarding');
      const savedScreening = await AsyncStorage.getItem('screeningResult');
      const savedProfile = await AsyncStorage.getItem('iobio_user_profile');

      if (savedUser) setUser(JSON.parse(savedUser));
      if (savedIsGuest) setIsGuest(JSON.parse(savedIsGuest));
      if (savedOnboarding) setHasCompletedOnboarding(JSON.parse(savedOnboarding));
      if (savedScreening) setScreeningResult(JSON.parse(savedScreening));
      if (savedProfile) setUserProfileState(JSON.parse(savedProfile));
    } catch (error) {
      console.error('Error loading saved data:', error);
    } finally {
      // Always set bootstrapped to true after attempting to load
      setIsBootstrapped(true);
    }
  };

  const saveUser = async (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      await AsyncStorage.setItem('user', JSON.stringify(newUser));
    } else {
      await AsyncStorage.removeItem('user');
    }
  };

  const saveIsGuest = async (guest: boolean) => {
    setIsGuest(guest);
    await AsyncStorage.setItem('isGuest', JSON.stringify(guest));
  };

  const saveHasCompletedOnboarding = async (completed: boolean) => {
    setHasCompletedOnboarding(completed);
    await AsyncStorage.setItem('hasCompletedOnboarding', JSON.stringify(completed));
  };

  const saveScreeningResult = async (result: ScreeningResult | null) => {
    setScreeningResult(result);
    if (result) {
      await AsyncStorage.setItem('screeningResult', JSON.stringify(result));
    } else {
      await AsyncStorage.removeItem('screeningResult');
    }
  };

  const setUserProfile = async (profile: UserProfile | null) => {
    setUserProfileState(profile);
    if (profile) {
      await AsyncStorage.setItem('iobio_user_profile', JSON.stringify(profile));
    } else {
      await AsyncStorage.removeItem('iobio_user_profile');
    }
  };

  const logout = async () => {
    await AsyncStorage.clear();
    setUser(null);
    setIsGuest(false);
    setHasCompletedOnboarding(false);
    setScreeningResult(null);
    setUserProfileState(null);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isGuest,
        hasCompletedOnboarding,
        screeningResult,
        isBootstrapped,
        userProfile,
        setUser: saveUser,
        setIsGuest: saveIsGuest,
        setHasCompletedOnboarding: saveHasCompletedOnboarding,
        setScreeningResult: saveScreeningResult,
        setUserProfile,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
