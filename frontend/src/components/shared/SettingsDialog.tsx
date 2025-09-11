import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { FriendsManager } from './FriendsManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { ThemeSwitcher } from './ThemeSwitcher';

interface SettingsDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onOpenChange }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]" aria-labelledby="settings-dialog-title">
                <DialogHeader>
                    <DialogTitle id="settings-dialog-title">Settings</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="friends" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="friends" aria-controls="settings-friends-tab">Friends</TabsTrigger>
                        <TabsTrigger value="theme" aria-controls="settings-theme-tab">Theme</TabsTrigger>
                    </TabsList>
                    <TabsContent value="friends" id="settings-friends-tab">
                        <FriendsManager />
                    </TabsContent>
                    <TabsContent value="theme" id="settings-theme-tab">
                        <ThemeSwitcher />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};
