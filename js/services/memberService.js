export function findMemberById(state, memberId) {
  return state.members.find((m) => m.id === memberId) || null;
}

export function findMemberByPhone(state, phone) {
  return state.members.find((m) => m.phone === phone) || null;
}

export function applyTopup(member, amount) {
  member.balance += amount;
  return member.balance;
}

export function markCouponUsed(member, couponId) {
  if (!member || !couponId) return null;
  const coupon = member.coupons?.find((c) => c.id === couponId);
  if (coupon) coupon.used = true;
  return coupon || null;
}

export function upgradeMemberTier(member, tiers) {
  if (!member) return null;

  const currentTierName = member.tier;
  const sortedTiers = [...tiers].sort((a, b) => b.minSpent - a.minSpent);

  for (const tier of sortedTiers) {
    if (member.totalSpent >= tier.minSpent) {
      if (currentTierName !== tier.name) {
        const oldTierData = tiers.find((t) => t.name === currentTierName);
        if (!oldTierData || tier.minSpent > oldTierData.minSpent) {
          member.tier = tier.name;
          return tier;
        }
      }
      break;
    }
  }

  return null;
}
