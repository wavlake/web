# Feature Development System

A standardized system for developing large features in Wavlake using git worktrees, parameterized documentation, and streamlined Claude workflows.

## 🚀 Quick Start

### 1. Set up a new feature:
```bash
./setup-feature.sh "Enhanced Authentication" "auth-updates"
```

### 2. Work in the isolated environment:
```bash
cd ../enhanced-auth-worktree
```

### 3. Use Claude efficiently:
```bash
# Simple command - context is automatically loaded
/work https://github.com/wavlake/web/issues/45
```

## 🎯 System Benefits

### **Git Worktrees**
- **Parallel development**: Work on multiple features simultaneously
- **Clean context**: No branch switching in main repo
- **Isolated environments**: Each feature has its own workspace
- **Easy cleanup**: Remove worktree when feature is complete

### **Parameterized Documentation**
- **Consistent structure**: All features follow the same documentation pattern
- **Automatic context loading**: Claude picks up feature context automatically
- **Progress tracking**: Real-time status updates in master todo
- **Reusable templates**: Copy and customize for any feature

### **Streamlined Claude Workflow**
- **No repetitive context**: Stop typing the same instructions
- **Automatic branch targeting**: Always works on the right branch
- **Feature-aware**: Knows the current status and what's already implemented
- **Worktree integration**: Automatically creates and manages worktrees

## 📁 File Structure

```
wavlake/web/
├── FEATURE_DEVELOPMENT_TEMPLATE.md     # Template for new features
├── FEATURE_DEVELOPMENT_README.md       # This file
├── setup-feature.sh                    # Automated setup script
├── ENHANCED_AUTH_MASTER_TODO.md         # Example: Enhanced auth feature
├── ENHANCED_AUTH_IMPLEMENTATION_PLAN.md
├── ENHANCED_AUTH_UX_FLOWS.md
└── ../enhanced-auth-worktree/          # Git worktree (outside main repo)
```

## 🛠️ Setting Up New Features

### Automated Setup (Recommended)
```bash
# Creates branch, worktree, and documentation
./setup-feature.sh "Feature Name" "feature-branch-name"
```

### Manual Setup
```bash
# 1. Create feature branch
git checkout -b feature-branch-name

# 2. Create worktree
git worktree add ../feature-name-worktree feature-branch-name

# 3. Copy template
cp FEATURE_DEVELOPMENT_TEMPLATE.md FEATURE_NAME_MASTER_TODO.md

# 4. Customize documentation
# Edit FEATURE_NAME_MASTER_TODO.md and replace placeholders
```

## 📝 Documentation Structure

Each feature has three main documentation files:

### 1. `[FEATURE_NAME]_MASTER_TODO.md`
- **Purpose**: Project status and progress tracking
- **Contains**: Todo lists, milestones, timelines, Claude context
- **Updated**: Continuously as work progresses

### 2. `[FEATURE_NAME]_IMPLEMENTATION_PLAN.md`
- **Purpose**: Technical implementation details
- **Contains**: Architecture, components, code examples
- **Updated**: As technical decisions are made

### 3. `[FEATURE_NAME]_UX_FLOWS.md`
- **Purpose**: User experience documentation
- **Contains**: User flows, wireframes, design decisions
- **Updated**: As UX is refined

## 🔧 Working with Features

### Starting Work
```bash
# Navigate to feature worktree
cd ../feature-name-worktree

# Use Claude with automatic context
/work https://github.com/wavlake/web/issues/[issue-number]
```

### Updating Progress
1. Edit `[FEATURE_NAME]_MASTER_TODO.md`
2. Mark completed tasks with `[x]`
3. Update progress percentages
4. Add new tasks as discovered

### Merging Features
```bash
# In main repository
git checkout main
git merge feature-branch-name

# Clean up worktree
git worktree remove ../feature-name-worktree
```

## 🎯 Claude Integration

### How Claude Finds Context

1. **Automatic Detection**: Claude reads the master todo file
2. **Branch Awareness**: Knows which branch to base work on
3. **Status Awareness**: Understands what's complete vs. what needs work
4. **File Awareness**: Knows which files are key to the feature

### Optimized Commands

**Before** (manual context):
```bash
/work https://github.com/wavlake/web/issues/45 make sure to take into context the ENHANCED_AUTH... md files, and base the branch off of the auth-updates branch
```

**After** (automatic context):
```bash
/work https://github.com/wavlake/web/issues/45
```

## 📊 Example: Enhanced Authentication

### Setup
```bash
./setup-feature.sh "Enhanced Authentication" "auth-updates"
cd ../enhanced-auth-worktree
```

### Files Created
- `ENHANCED_AUTH_MASTER_TODO.md` - 75% complete, Phase 3 remaining
- `ENHANCED_AUTH_IMPLEMENTATION_PLAN.md` - Technical architecture
- `ENHANCED_AUTH_UX_FLOWS.md` - User experience flows

### Claude Context
- **Base Branch**: `auth-updates`
- **Status**: 75% complete
- **Key Files**: `src/components/auth/`, `src/hooks/useAutoLinkPubkey.ts`
- **Remaining Work**: Upload flow integration

## 🚀 Advanced Usage

### Multiple Features
```bash
# Set up multiple features simultaneously
./setup-feature.sh "Upload System" "upload-feature"
./setup-feature.sh "Payment Flow" "payment-feature"

# Work on them in parallel
cd ../upload-system-worktree    # Terminal 1
cd ../payment-flow-worktree     # Terminal 2
```

### Feature Dependencies
```bash
# Create feature based on another feature branch
git checkout feature-branch-1
./setup-feature.sh "Dependent Feature" "dependent-feature"
```

### Worktree Management
```bash
# List all worktrees
git worktree list

# Remove completed worktree
git worktree remove ../feature-name-worktree

# Prune removed worktrees
git worktree prune
```

## 🛡️ Best Practices

### Documentation
- **Keep todo lists updated**: Mark tasks complete as you finish them
- **Update progress percentages**: Reflect actual completion status
- **Document decisions**: Record important technical and UX decisions

### Git Workflow
- **Use descriptive branch names**: `feature-name` or `issue-123-feature-name`
- **Work in worktrees**: Keep main repo clean for other work
- **Regular commits**: Small, focused commits with clear messages

### Claude Workflow
- **Trust the context**: Let Claude read the documentation automatically
- **Update status first**: Before major work sessions, update progress
- **Be specific in issues**: GitHub issues should be clear and actionable

## 🔧 Troubleshooting

### Worktree Issues
```bash
# Error: worktree already exists
git worktree remove ../feature-name-worktree
git worktree add ../feature-name-worktree feature-branch-name

# Error: branch doesn't exist
git checkout -b feature-branch-name
git worktree add ../feature-name-worktree feature-branch-name
```

### Claude Context Issues
```bash
# Claude not finding context
# 1. Check that [FEATURE_NAME]_MASTER_TODO.md exists
# 2. Verify the "Development Workflow Context" section
# 3. Ensure you're in the correct worktree directory
```

### Template Issues
```bash
# Template not found
# Make sure you're in the main repository directory
# FEATURE_DEVELOPMENT_TEMPLATE.md should be in the root
```

---

This system transforms feature development from a manual, error-prone process into a streamlined, automated workflow that scales with your project's complexity.