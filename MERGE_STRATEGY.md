# Upstream Merge Strategy - Chorus to Wavlake

## Overview

This document outlines the strategy for synchronizing Wavlake's fork with the upstream Chorus repository while preserving Wavlake's unique architectural changes and music-focused features.

## Current Divergence Status

### Fork Analysis (as of 2025-01-07)
- **Wavlake**: 89 commits ahead of fork point
- **Upstream Chorus**: 17 commits ahead of fork point  
- **Common Ancestor**: `df4600d` (feature/group-posts-feed merge)
- **Files Changed Upstream**: 129 files
- **Risk Level**: High (significant architectural differences)

### Latest Sync Status (as of 2025-01-07)
- **Branch**: `upstream-sync-2025-01` 
- **PR**: [#4](https://github.com/wavlake/web/pull/4)
- **Integrated Features**:
  - ✅ Group Image Placeholders (commit 200f830)
  - ✅ Spam Filter (commit 64c1fb9)
  - ✅ Kind 1111 Protocol Support (commits 3637b85, 4d7d383)
- **Security Enhancements Added**:
  - ✅ Image URL validation
  - ✅ Error logging with context
  - ✅ Improved reply detection logic

### Repository Configuration
```bash
# Upstream remote (already configured)
git remote add upstream https://github.com/andotherstuff/chorus.git
git fetch upstream

# Divergence check
git rev-list --left-right --count main...upstream/main
# Result: 89 (ahead) 17 (behind)
```

## Architecture Differences

### Wavlake's Major Changes
1. **GlobalLayout System** - Centralized header/footer management
2. **Firebase Hybrid Auth** - Nostr + Firebase for business features
3. **Music-Focused Features** - Artist dashboard, music publishing
4. **Simplified Authentication** - Removed Firebase from main login flow
5. **Documentation Cleanup** - Consolidated `.md` files

### Upstream's Recent Additions
1. **Relay Selector** - Network connection management
2. **Group Image Placeholders** - UI improvements
3. **Kind 1111 Posting** - Protocol updates
4. **Spam Filter** - Content moderation
5. **Linting Improvements** - Code quality

## Merge Strategy

### Phase 1: Low-Risk Utility Synchronization (Priority)

#### Target Areas for Sync
- **Utility Functions** (`src/lib/`)
- **Shared Components** (non-layout related)
- **Bug Fixes** (security, performance)
- **Protocol Updates** (Nostr spec compliance)

#### Safe Cherry-Pick Candidates
```bash
# Group image placeholders (UI improvement)
git cherry-pick 200f830

# Spam filter (content moderation)
git cherry-pick 64c1fb9  

# Bug fixes and small improvements
git cherry-pick <specific-commit-hashes>
```

### Phase 2: Component-Level Synchronization

#### Low Conflict Risk Components
- `src/components/cashu/` - Payment components
- `src/components/groups/` - Group functionality (selective)
- `src/hooks/` - Custom hooks (review for conflicts)
- `src/lib/` - Utility libraries

#### Medium Conflict Risk Components  
- `src/components/auth/` - Authentication (we simplified, they enhanced)
- `src/components/groups/CreatePostForm.tsx` - Both sides modified
- `src/pages/` - We removed headers, they may have other changes

#### High Conflict Risk Components (Avoid/Manual)
- `src/AppRouter.tsx` - We added GlobalLayout
- `src/components/NostrProvider.tsx` - Core functionality
- `src/App.tsx` - App-level changes
- Documentation files

### Phase 3: Feature-Specific Integration

#### High Value Features for Integration

1. **Relay Selector**
   - **Files**: `src/components/RelaySelector.tsx`, App context changes
   - **Strategy**: Manual integration due to app structure conflicts
   - **Priority**: Medium

2. **Kind 1111 Posting Support**
   - **Files**: Multiple posting components
   - **Strategy**: Review protocol compatibility first
   - **Priority**: High (protocol compliance)

3. **Enhanced Group Management**
   - **Files**: Group-related components
   - **Strategy**: Selective integration of non-conflicting features
   - **Priority**: Medium

## Implementation Progress

### Phase 1 ✅ COMPLETED (2025-01-07)
1. **Created working branch**: `upstream-sync-2025-01`
2. **Analyzed upstream commits**: Identified high-value features
3. **Successfully integrated**:
   - Group image placeholders with fallback UI
   - Spam filtering system
   - Kind 1111 protocol support
4. **Enhanced with security fixes**:
   - URL validation for external images
   - Comprehensive error logging
   - Improved detection logic

### Phase 2: Next Priority Items (TODO)
1. **Relay Selector Feature**
   - Review commit 03f9d34, df1a297
   - Requires manual integration due to app structure
   - Consider impact on NostrProvider architecture

2. **Additional UI Improvements**
   - Review remaining UI enhancements
   - Ensure compatibility with music platform focus

3. **Linting Updates**
   - Review eslint configuration changes
   - Selectively adopt improvements

### Lessons Learned from Phase 1
1. **Greenfield Advantage**: No need for backwards compatibility
2. **Security First**: Always validate external content (URLs, user input)
3. **PR Review**: Automated tools may show outdated feedback
4. **Documentation**: Keep merge strategy updated for continuity

### Remaining High-Value Features
1. **Relay Selector** (Medium Priority)
   - Complex integration due to core app changes
   - May require architectural decisions

2. **Enhanced Group Management** (Low-Medium Priority)  
   - Review for music platform applicability
   - Cherry-pick selectively

3. **Additional Protocol Updates** (Monitor)
   - Keep watching for new NIPs implementation
   - Maintain protocol compliance

## Conflict Resolution Strategy

### Decision Matrix

| Change Type | Wavlake Priority | Upstream Priority | Resolution Strategy |
|-------------|------------------|-------------------|-------------------|
| Core Architecture | HIGH | LOW | Keep Wavlake (GlobalLayout, Auth) |
| Protocol Updates | MEDIUM | HIGH | Integrate (Nostr compliance) |
| UI Components | MEDIUM | MEDIUM | Selective merge |
| Utility Functions | LOW | HIGH | Prefer upstream |
| Bug Fixes | HIGH | HIGH | Always integrate |
| Documentation | HIGH | LOW | Keep Wavlake structure |

### Conflict Resolution Process

1. **Identify Conflict Type**
   - Architecture: Favor Wavlake's music-focused approach
   - Protocol: Favor upstream's Nostr compliance
   - UI: Evaluate case-by-case for music platform needs
   - Utils: Prefer upstream's improvements

2. **Resolution Steps**
   ```bash
   # For each conflict:
   git status  # Identify conflicted files
   
   # Analyze conflict
   git diff <file>
   
   # Choose resolution strategy:
   # - Keep ours: git checkout --ours <file>
   # - Keep theirs: git checkout --theirs <file>  
   # - Manual merge: Edit file manually
   
   git add <file>
   ```

3. **Testing Requirements**
   - All existing tests must pass
   - GlobalLayout system must remain functional
   - Authentication flows must work
   - Music-specific features must be preserved

## Specific Feature Analysis

### High Priority for Integration

#### 1. Group Image Placeholders ✅ COMPLETED
- **Risk**: Low
- **Value**: High (UX improvement)
- **Files**: `GroupDetail.tsx`, `GroupGuidelines.tsx`, `CommunityProfileHeader.tsx`
- **Strategy**: Direct cherry-pick
- **Status**: Integrated with security enhancements (URL validation)

#### 2. Spam Filter ✅ COMPLETED
- **Risk**: Low-Medium  
- **Value**: High (content quality)
- **Files**: `src/lib/spam-filter.ts`, `Groups.tsx`, `PostList.tsx`
- **Strategy**: Cherry-pick with testing
- **Status**: Integrated with documentation improvements
- **Note**: Keywords should be moved to secure config in production

#### 3. Protocol Updates (Kind 1111) ✅ COMPLETED
- **Risk**: Medium
- **Value**: High (protocol compliance)
- **Files**: `nostr-kinds.ts`, `PostList.tsx`, `usePendingPostsCount.ts`, `useGroupStats.ts`
- **Strategy**: Careful review and testing
- **Status**: Integrated with improved reply detection
- **Note**: Removed backwards compatibility as this is greenfield

### Medium Priority for Integration

#### 4. Relay Selector
- **Risk**: High (core app changes)
- **Value**: Medium (network flexibility)
- **Files**: App.tsx, NostrProvider.tsx, new components
- **Strategy**: Manual integration in separate branch

#### 5. Linting Improvements
- **Risk**: Low
- **Value**: Medium (code quality)
- **Files**: eslint config, package.json
- **Strategy**: Selective adoption

### Low Priority (Music Platform Specific)

#### 6. General UI Changes
- **Risk**: Variable
- **Value**: Low (may not fit music platform)
- **Strategy**: Evaluate individually

## Ongoing Synchronization

### Regular Sync Schedule
- **Monthly Check**: Review upstream commits
- **Quarterly Sync**: Integrate valuable low-risk changes
- **Major Updates**: Plan dedicated sync cycles for large features

### Automated Monitoring
```bash
# Add to CI/CD or regular maintenance script
git fetch upstream
BEHIND_COUNT=$(git rev-list --count main..upstream/main)
if [ $BEHIND_COUNT -gt 10 ]; then
  echo "WARNING: Repository is $BEHIND_COUNT commits behind upstream"
  echo "Consider running merge strategy review"
fi
```

### Change Categories for Quick Assessment

1. **Auto-Integrate**: Bug fixes, security patches, utility improvements
2. **Review for Integration**: Protocol updates, shared components
3. **Manual Integration**: UI changes, architecture changes  
4. **Skip**: Changes that conflict with music platform focus

## Risk Mitigation

### Backup Strategy
```bash
# Before any merge operation
git tag pre-merge-$(date +%Y%m%d)
git push origin pre-merge-$(date +%Y%m%d)
```

### Testing Requirements
- [ ] All existing functionality preserved
- [ ] GlobalLayout system works correctly
- [ ] Authentication flows intact
- [ ] Music-specific features functional
- [ ] Performance not degraded
- [ ] Build pipeline succeeds

### Rollback Plan
```bash
# If merge causes issues
git reset --hard pre-merge-$(date +%Y%m%d)
# Or revert specific commits
git revert <problematic-commit>
```

## Success Metrics

### Integration Goals
- [ ] Maintain <20 commits divergence from upstream utilities
- [ ] Integrate 80%+ of protocol compliance updates
- [ ] Preserve 100% of Wavlake-specific functionality
- [ ] No performance regression >5%
- [ ] Zero security regressions

### Quality Gates
- [ ] All tests pass
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Manual testing of key workflows
- [ ] Performance benchmarks maintained

## Communication Strategy

### Documentation Updates
- Update `CLAUDE.md` with any new patterns or changes
- Document integrated features in commit messages
- Update `README.md` if new functionality added

### Team Coordination
- Create PR for each major integration phase
- Review changes with team before merging to main
- Document any breaking changes or new requirements

---

## Quick Reference Commands

```bash
# Setup
git remote add upstream https://github.com/andotherstuff/chorus.git
git fetch upstream

# Analysis
git log --oneline upstream/main ^main
git diff --name-only main...upstream/main

# Cherry-pick workflow  
git checkout -b feature/upstream-<feature-name>
git cherry-pick <commit-hash>
git push origin feature/upstream-<feature-name>

# Check specific commit details
git show <commit-hash> --stat
git show <commit-hash>:path/to/file

# Full merge (use with caution)
git checkout -b merge/upstream-sync
git merge upstream/main
# Resolve conflicts manually
```

## Continuing the Sync Effort

To continue from where we left off:

1. **Review PR #4**: Ensure it's merged to main
2. **Create new branch**: `git checkout -b upstream-sync-2025-01-phase2`
3. **Fetch latest**: `git fetch upstream`
4. **Next priorities**:
   - Relay selector feature (manual integration required)
   - Review remaining commits for utility improvements
   - Monitor for new upstream features

### Key Decisions Needed
- Should we integrate the relay selector given architectural differences?
- How much UI divergence is acceptable from upstream?
- What's our policy on linting rule adoption?

This strategy prioritizes keeping Wavlake's music-focused architecture while selectively integrating valuable improvements from upstream Chorus development.