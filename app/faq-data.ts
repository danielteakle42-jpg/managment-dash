export type FaqItem = { id: string; title: string; keywords: string[]; answer: string };

export const LIVE_FAQ: FaqItem[] = [
  { id:'frag', title:'What are frags?', keywords:['frag','frags','league target','stay league','go up league','diamonds needed'], answer:'🏆 Frags are the Diamond target connected to your LIVE league. They show how many Diamonds you need to help stay in your current league or move up. Frags are NOT battle points. Check your LIVE league/ranking area for your current target.' },
  { id:'diamonds', title:'What are Diamonds?', keywords:['diamond','diamonds','gift earnings','rewards'], answer:'💎 Diamonds are the creator-side reward metric connected to eligible LIVE Gifts. They are separate from Coins, battle points and your frag target. You can check them in your LIVE rewards/analytics areas.' },
  { id:'battle', title:'How do battles work?', keywords:['battle','match','live match','battle someone'], answer:'⚔️ A LIVE Match is a timed battle between creators. Both communities score points and the highest score wins. While LIVE, tap +Hosts, connect with a creator, then choose Match. Battles are also useful for networking and meeting new viewers.' },
  { id:'glove', title:'What is a glove?', keywords:['glove','gloves','power up','power-up'], answer:'🧤 A Glove is a battle power-up that can affect scoring during an eligible part of a match. Watch the battle screen for when it is active and follow the rules shown there, as TikTok can change power-up behaviour.' },
  { id:'speed', title:'What is speed?', keywords:['speed','speed challenge','need speed'], answer:'⚡ Speed is a timed challenge/bonus you may see in a battle. Your room needs to hit the target shown before the timer ends. If completed, TikTok can unlock a battle advantage shown on screen.' },
  { id:'multiplier', title:'What does 2X / 3X mean?', keywords:['2x','3x','double','triple','multiplier'], answer:'✖️ 2X or 3X means qualifying battle points can be multiplied while that bonus is active. Always watch the match screen so you know exactly when a multiplier is running.' },
  { id:'snipe', title:'What is a snipe?', keywords:['snipe','sniping','last second'], answer:'🎯 A snipe is support sent right at the end of a battle to try to jump ahead and win before the timer finishes.' },
  { id:'streak', title:'What is a streak?', keywords:['streak','win streak','take streak'], answer:'🔥 A streak is consecutive battle wins where TikTok shows the feature. If someone beats a creator with a streak, creators often call that “taking their streak”.' },
  { id:'gifts', title:'What are Gifts and Coins?', keywords:['gift','gifts','coins','coin'], answer:'🎁 Viewers buy Coins and use them to send virtual Gifts. Gifts can contribute to battle scores and eligible creator rewards. Coins are viewer-side; Diamonds are creator-side.' },
  { id:'fanclub', title:'What is Fan Club?', keywords:['fan club','fanclub','heart me','fan level'], answer:'❤️ Fan Club is a way for regular LIVE viewers to become part of your LIVE community and level up through eligible activity. Welcome members back and recognise milestones — regulars are what make a room strong.' },
  { id:'subscription', title:'What are Subscriptions?', keywords:['subscription','subscriber','subscribe'], answer:'⭐ Subscription is separate from Fan Club. Eligible viewers can pay for a creator subscription and receive the benefits TikTok makes available on that account.' },
  { id:'cohost', title:'How do I find creators to battle?', keywords:['cohost','co-host','hosts','find battle','find creators','+hosts'], answer:'👥 While LIVE, tap +Hosts. TikTok can show creators you can connect with. Invite someone, talk first, then start a Match. Meet new creators as well as your regular battle partners.' },
  { id:'likes', title:'How should I use like targets?', keywords:['likes','like target','tap target','taps'], answer:'❤️ Give the room a simple free target: 5K → 10K → 25K → 50K. Try “We’re 2K away — everyone give me 10 taps!” Celebrate when the room hits it, then set the next goal.' },
  { id:'retention', title:'How do I get more viewers?', keywords:['more viewers','boost live','push live','fyp','traffic','retention','grow live','growth'], answer:'🚀 Focus on what happens AFTER someone enters. Keep talking, ask easy questions, use like/share targets naturally, battle and network, explain what is happening to new viewers, and give people a reason to follow and return. No trick guarantees a push — retention and genuine interaction matter.' },
  { id:'titles', title:'What LIVE titles should I use?', keywords:['title','titles','live title','name live'], answer:'📝 Make the title explain what is happening. Examples: “⚔️ ROAD TO THE NEXT LEAGUE”, “🏆 RANK PUSH — LET’S CLIMB”, “🔥 ROAD TO 10 WINS”, “💬 LATE NIGHT CHATS”, or “❤️ ROAD TO 50K LIKES”. A title can help people understand the LIVE, but it cannot guarantee a push or league promotion.' },
  { id:'campaigns', title:'How do campaigns work?', keywords:['campaign','campaigns','missions','event','leaderboard','activities'], answer:'🎯 LIVE campaigns are TikTok events with their own missions, scoring and rewards. Check LIVE Center / Campaigns or Activities, open the campaign, then read Rules, Missions, Leaderboard, Rewards and the start/end time. Never assume every campaign is based only on Diamonds.' },
  { id:'analytics', title:'What analytics should I check?', keywords:['analytics','stats','watch time','average viewers','peak viewers'], answer:'📊 After LIVE, check average viewers, peak viewers, watch time, new followers, comments, likes, shares, gifters and Diamonds. Compare LIVEs and repeat the formats that improve retention and returning viewers.' },
  { id:'arranged', title:'What is an arranged battle?', keywords:['arranged battle','scheduled battle','book battle'], answer:'📅 An arranged battle is planned in advance with an opponent, date and time. Promote bigger battles beforehand so both communities know when to show up.' },
  { id:'moderator', title:'What do moderators do?', keywords:['mod','mods','moderator','mute','block'], answer:'🛡️ Mods help manage chat, welcome viewers and handle disruption. Only give moderator access to people you trust. Mute/block trolls instead of spending the whole LIVE arguing.' },
];

export function findFaqAnswer(question: string) {
  const q = question.toLowerCase().replace(/[^a-z0-9+ ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!q) return null;
  let best: { item: FaqItem; score: number } | null = null;
  for (const item of LIVE_FAQ) {
    let score = 0;
    for (const keyword of item.keywords) {
      const k = keyword.toLowerCase();
      if (q.includes(k)) score += k.includes(' ') ? 5 : 3;
      else if (k.length > 4 && q.split(' ').some(w => w.length > 3 && (k.includes(w) || w.includes(k)))) score += 1;
    }
    if (!best || score > best.score) best = { item, score };
  }
  return best && best.score >= 2 ? best.item : null;
}
