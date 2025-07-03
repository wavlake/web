import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCommunityContext } from '@/contexts/CommunityContext';
import { Crown, Shield, Users, Settings, Edit, AlertTriangle } from 'lucide-react';
import { RoleBadge } from '@/components/groups/RoleBadge';

interface CommunityPrivilegesProps {
  showUpdateCommunityFeatures?: boolean;
}

export function CommunityPrivileges({ showUpdateCommunityFeatures = false }: CommunityPrivilegesProps) {
  const {
    selectedCommunity,
    userRole,
    canManageCommunity,
    canUpdateCommunity,
    canModerate,
    getCommunityName,
  } = useCommunityContext();

  if (!selectedCommunity) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>No Artist Page Selected</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select or create an artist page to view community privileges and permissions.
          </p>
        </CardContent>
      </Card>
    );
  }

  const communityName = getCommunityName(selectedCommunity);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {userRole === 'owner' ? (
            <Crown className="h-5 w-5 text-yellow-500" />
          ) : (
            <Shield className="h-5 w-5 text-blue-500" />
          )}
          <span>Community Permissions</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Role Badge */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Your role in {communityName}:</span>
          <RoleBadge role={userRole} />
        </div>

        {/* Permissions List */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Available Actions:</h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            {canManageCommunity && (
              <div className="flex items-center space-x-2">
                <Users className="h-3 w-3" />
                <span>Manage community members</span>
              </div>
            )}
            {canModerate && (
              <div className="flex items-center space-x-2">
                <Shield className="h-3 w-3" />
                <span>Moderate posts and replies</span>
              </div>
            )}
            {canUpdateCommunity && (
              <div className="flex items-center space-x-2">
                <Edit className="h-3 w-3" />
                <span>Update community information</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Settings className="h-3 w-3" />
              <span>Create announcements and posts</span>
            </div>
          </div>
        </div>

        {/* Owner-only Features */}
        {userRole === 'owner' && showUpdateCommunityFeatures && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-sm font-semibold text-yellow-700">Owner Only:</h4>
            <Alert>
              <Crown className="h-4 w-4" />
              <AlertDescription className="text-xs">
                As the owner, you can update the community's core information (kind 34550 event).
                This includes the community name, description, rules, and other metadata.
              </AlertDescription>
            </Alert>
            <Button size="sm" variant="outline" className="w-full">
              <Edit className="h-3 w-3 mr-2" />
              Update Community Details
            </Button>
          </div>
        )}

        {/* Warning for Moderators */}
        {userRole === 'moderator' && showUpdateCommunityFeatures && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Only the community owner can update core community information.
              Contact the owner to request changes to community details.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for sidebars or smaller spaces
export function CommunityPrivileges_Compact() {
  const {
    userRole,
    getCommunityName,
    selectedCommunity,
  } = useCommunityContext();

  if (!selectedCommunity) {
    return (
      <div className="text-xs text-muted-foreground">
        No artist page selected
      </div>
    );
  }

  const communityName = getCommunityName(selectedCommunity);

  return (
    <div className="text-xs">
      <div className="flex items-center space-x-1">
        {userRole === 'owner' ? (
          <Crown className="h-3 w-3 text-yellow-500" />
        ) : (
          <Shield className="h-3 w-3 text-blue-500" />
        )}
        <span className="text-muted-foreground">
          {userRole} of {communityName}
        </span>
      </div>
    </div>
  );
}