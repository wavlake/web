import { Button } from "@/components/ui/button";
import {
  Check,
  MapPin,
  Globe,
  DollarSign,
  Users,
  QrCode,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { JoinRequestButton } from "@/components/groups/JoinRequestButton";
import { useApprovedMembers } from "@/hooks/useApprovedMembers";
import { useAuthor } from "@/hooks/useAuthor";
import { QRCodeModal } from "@/components/QRCodeModal";
import { useState } from "react";
import { GroupNutzapButton } from "@/components/groups/GroupNutzapButton";

interface CommunityProfileHeaderProps {
  communityId: string;
  name: string;
  username: string;
  npub: string;
  nip05?: string;
  bio: string;
  location?: string;
  website?: string;
  profileImage?: string;
  bannerImage?: string;
  verified?: boolean;
}

export function CommunityProfileHeader({
  communityId,
  name,
  username,
  npub,
  nip05,
  bio,
  location,
  website,
  profileImage,
  bannerImage,
  verified = false,
}: CommunityProfileHeaderProps) {
  const [showQR, setShowQR] = useState(false);
  
  // Get approved members data
  const { approvedMembers, isLoading: membersLoading } = useApprovedMembers(communityId);

  // Calculate total member count
  const totalMemberCount = approvedMembers.length;

  // Get a sample of members to display (first 3 approved members)
  const sampleMemberPubkeys = approvedMembers.slice(0, 3);

  // Get author data for the sample members
  const member1 = useAuthor(sampleMemberPubkeys[0]);
  const member2 = useAuthor(sampleMemberPubkeys[1]);
  const member3 = useAuthor(sampleMemberPubkeys[2]);

  interface MemberWithAuthorData {
    pubkey: string;
    name?: string;
    username: string;
    image?: string;
  }

  const membersWithAuthorData: MemberWithAuthorData[] = [];
  
  // Add members that exist
  if (sampleMemberPubkeys[0]) {
    membersWithAuthorData.push({
      pubkey: sampleMemberPubkeys[0],
      name: member1.data?.metadata?.display_name || member1.data?.metadata?.name,
      username: member1.data?.metadata?.name?.toLowerCase().replace(/\s+/g, "") || sampleMemberPubkeys[0].slice(0, 8),
      image: member1.data?.metadata?.picture,
    });
  }
  
  if (sampleMemberPubkeys[1]) {
    membersWithAuthorData.push({
      pubkey: sampleMemberPubkeys[1],
      name: member2.data?.metadata?.display_name || member2.data?.metadata?.name,
      username: member2.data?.metadata?.name?.toLowerCase().replace(/\s+/g, "") || sampleMemberPubkeys[1].slice(0, 8),
      image: member2.data?.metadata?.picture,
    });
  }
  
  if (sampleMemberPubkeys[2]) {
    membersWithAuthorData.push({
      pubkey: sampleMemberPubkeys[2],
      name: member3.data?.metadata?.display_name || member3.data?.metadata?.name,
      username: member3.data?.metadata?.name?.toLowerCase().replace(/\s+/g, "") || sampleMemberPubkeys[2].slice(0, 8),
      image: member3.data?.metadata?.picture,
    });
  }

  return (
    <div className="relative">
      {/* Banner Image */}
      <div className="relative w-full h-48 sm:h-56 md:h-64 lg:h-72 xl:h-80">
        {bannerImage ? (
          <img
            src={bannerImage}
            alt={`${name}'s banner`}
            className="w-full h-full object-cover object-center"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-400 via-pink-500 to-red-500" />
        )}
        {/* Optional overlay for better text readability */}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* Profile Info - Moved below the banner */}
      <div className="container max-w-7xl px-4 mx-auto bg-background pt-6 pb-4">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Profile Image - Positioned to overlap the banner */}
          <div className="relative z-10 flex-shrink-0 w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-background shadow-lg -mt-16 md:-mt-20">
            {profileImage && profileImage !== "/placeholder.svg" ? (
              <img
                src={profileImage}
                alt={name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <div 
              className={`w-full h-full bg-primary/10 text-primary font-bold text-4xl flex items-center justify-center ${profileImage && profileImage !== "/placeholder.svg" ? 'hidden' : 'flex'}`}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Profile Details */}
          <div className="flex flex-col justify-end w-full">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    {name}
                  </h1>
                  {verified && (
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <p className="text-muted-foreground">@{username}</p>

                  {nip05 && (
                    <div className="flex items-center gap-2">
                      <span className="text-foreground text-sm">{nip05}</span>
                      <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-2 h-2 text-white" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQR(true)}
                    className="h-auto p-0 flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <QrCode className="h-3 w-3" />
                    <span className="text-xs">QR Code</span>
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        >
                          <FileText className="h-3 w-3" />
                          <span className="text-xs">Community Guidelines</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View Community Guidelines</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <div className="flex gap-3">
                <GroupNutzapButton groupId={communityId} ownerPubkey={npub} />
                <JoinRequestButton 
                  communityId={communityId}
                  className="gap-2"
                />
              </div>
            </div>

            <div className="mt-4">
              <p className="text-muted-foreground mb-3 max-w-2xl">{bio}</p>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">
                    {totalMemberCount.toLocaleString()}
                  </span>
                  <span>{totalMemberCount === 1 ? 'member' : 'members'}</span>
                </div>

                {location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{location}</span>
                  </div>
                )}

                {website && (
                  <div className="flex items-center gap-1">
                    <Globe className="w-4 h-4" />
                    <a
                      href={`https://${website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground hover:text-muted-foreground hover:underline flex items-center gap-1"
                    >
                      {website}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Community Members */}
              <div className="mt-4 bg-muted rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {membersLoading ? (
                      // Loading skeletons
                      Array.from({ length: 3 }).map((_, index) => (
                        <div
                          key={index}
                          className="h-8 w-8 rounded-full bg-muted-foreground/30 border-2 border-background animate-pulse"
                        />
                      ))
                    ) : (
                      membersWithAuthorData.slice(0, 3).map((member) => (
                        <Link
                          key={member.pubkey}
                          to={`/profile/${member.pubkey}`}
                          className="block"
                        >
                          <Avatar
                            className="h-8 w-8 border-2 border-background hover:scale-110 transition-transform cursor-pointer"
                          >
                            <AvatarImage
                              src={member.image}
                              alt={member.name || member.username}
                            />
                            <AvatarFallback>
                              {(member.name || member.username || 'U')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                      ))
                    )}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-foreground">
                      {totalMemberCount} community {totalMemberCount === 1 ? 'member' : 'members'}
                    </span>
                    {!membersLoading && membersWithAuthorData.length > 0 && (
                      <div className="text-muted-foreground">
                        Including{" "}
                        {membersWithAuthorData.slice(0, 2).map((member, index) => (
                          <span key={member.pubkey}>
                            {index > 0 && ", "}
                            <Link 
                              to={`/profile/${member.pubkey}`}
                              className="font-medium hover:underline"
                            >
                              {member.name || member.username}
                            </Link>
                          </span>
                        ))}
                        {membersWithAuthorData.length > 2 && (
                          <span>
                            , and{" "}
                            <Link 
                              to={`/profile/${membersWithAuthorData[2].pubkey}`}
                              className="font-medium hover:underline"
                            >
                              {membersWithAuthorData[2].name || membersWithAuthorData[2].username}
                            </Link>
                          </span>
                        )}
                        {totalMemberCount > 3 && (
                          <span> and {totalMemberCount - 3} others</span>
                        )}
                        .
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <QRCodeModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        profileUrl={`${window.location.origin}/group/${communityId}`}
        displayName={name}
        title={`${name} Community`}
      />
    </div>
  );
}