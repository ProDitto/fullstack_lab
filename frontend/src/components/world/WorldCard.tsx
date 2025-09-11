import * as React from 'react';
import type { OpenWorld } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Users, Lock } from 'lucide-react'; // Added Lock icon

interface WorldCardProps {
    world: OpenWorld;
    onJoin: (world: OpenWorld) => void;
}

export const WorldCard: React.FC<WorldCardProps> = ({ world, onJoin }) => {
    return (
        <Card className="flex flex-col" aria-label={`Open world: ${world.name}`}>
            <CardHeader className="p-0">
                <img 
                    src={world.imageUrl} 
                    alt={world.name} 
                    className="rounded-t-lg aspect-video object-cover w-full h-40" 
                    loading="lazy"
                />
            </CardHeader>
            <CardContent className="p-4 flex-1">
                <CardTitle className="text-xl mb-1 flex items-center">
                    {world.name}
                    {world.isPasswordProtected && <Lock className="h-4 w-4 ml-2 text-text-secondary" aria-label="Password protected" />}
                </CardTitle>
                <CardDescription className="line-clamp-3">{world.description}</CardDescription>
            </CardContent>
            <CardFooter className="p-4 flex justify-between items-center">
                <div className="flex items-center text-sm text-text-secondary">
                    <Users className="h-4 w-4 mr-2" aria-hidden="true" /> <span aria-label={`Population: ${world.population}`}>{world.population}</span>
                </div>
                <Button onClick={() => onJoin(world)} aria-label={`Join ${world.name}`}>Join World</Button>
            </CardFooter>
        </Card>
    );
};
