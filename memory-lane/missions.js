/* MEMORY LANE ／ Mission マスタ Ver.0.1
   ─────────────────────────────────────────────
   media : photo | video | audio
   scene : trip / bar / hotel / food / school / club / family / couple / company / anytime
   role  : self=自分中心 / other=誰かを撮る / group=全員 / place=場所やモノ
   ※「◯時に撮ってください」という命令にはしない。視点だけを置く。
   ※このファイルは app.html（体験プロトタイプ）と biz.html（管理画面）で共有する。
*/
window.ML_MISSIONS = [
  /* ── 旅（trip）1-12 ───────────────────────── */
  {id:'T01', scene:'trip', media:'photo', role:'group', text:'まず、全員が写った一枚を。',            hint:'この旅の「はじまり」。ここだけは、ちゃんと並んでいい。'},
  {id:'T02', scene:'trip', media:'photo', role:'other', text:'いつも撮っている人を、今日は撮ろう。',  hint:'カメラの後ろにいる人ほど、写真が残らない。'},
  {id:'T03', scene:'trip', media:'photo', role:'other', text:'誰もカメラを見ていない一枚を。',        hint:'「撮るよ」は言わなくていい。'},
  {id:'T04', scene:'trip', media:'photo', role:'other', text:'海を見ている誰かを、一枚。',            hint:'顔じゃなくて、横顔でも、背中でもいい。'},
  {id:'T05', scene:'trip', media:'photo', role:'other', text:'今日、一番笑っている瞬間を。',          hint:'笑い終わったあとでも間に合う。'},
  {id:'T06', scene:'trip', media:'photo', role:'place', text:'移動中の車内を、一枚。',                hint:'着く前の時間も、旅のうち。'},
  {id:'T07', scene:'trip', media:'video', role:'group', text:'今のみんなの笑い声を、10秒だけ。',      hint:'画面は揺れていていい。音が主役。'},
  {id:'T08', scene:'trip', media:'photo', role:'other', text:'寝ている人を、そっと一枚。',            hint:'起こさないように。起きたら見せてあげて。'},
  {id:'T09', scene:'trip', media:'photo', role:'place', text:'今日食べたもので、一番おいしかったものを。', hint:'一口食べてからでいい。'},
  {id:'T10', scene:'trip', media:'photo', role:'other', text:'一番前を歩いている人の背中を。',        hint:'先頭の人は、いつも写真に写らない。'},
  {id:'T11', scene:'trip', media:'photo', role:'group', text:'集合写真じゃない一枚を。',              hint:'並んでいない、そのままの並び方で。'},
  {id:'T12', scene:'trip', media:'photo', role:'place', text:'帰る前に、何でもない今を一枚。',        hint:'最後の一枚は、名所じゃなくていい。'},

  /* ── BAR・夜（bar）13-22 ──────────────────── */
  {id:'B01', scene:'bar',  media:'photo', role:'group', text:'乾杯した瞬間を、一枚。',                hint:'グラスが当たる音がしそうな一枚を。'},
  {id:'B02', scene:'bar',  media:'photo', role:'other', text:'沖縄で一番笑った顔を、一枚。',          hint:'この店で更新されたら、撮り直していい。'},
  {id:'B03', scene:'bar',  media:'photo', role:'other', text:'今日いちばん酔っている人を、一枚。',    hint:'明日、本人に見せる用。'},
  {id:'B04', scene:'bar',  media:'video', role:'group', text:'いま話している話題を、10秒だけ動画で。',hint:'くだらない話ほど、あとで効く。'},
  {id:'B05', scene:'bar',  media:'photo', role:'place', text:'一番おいしかった一杯を。',              hint:'グラス越しの人が入っても正解。'},
  {id:'B06', scene:'bar',  media:'photo', role:'other', text:'今日、初めて話した人を一枚。',          hint:'名前を聞いてから撮ると、もっといい。'},
  {id:'B07', scene:'bar',  media:'audio', role:'group', text:'この店の音を、15秒だけ録ろう。',        hint:'音楽、笑い声、氷の音。'},
  {id:'B08', scene:'bar',  media:'photo', role:'other', text:'マスターと、その手元を。',              hint:'つくっているところが、この店の顔。'},
  {id:'B09', scene:'bar',  media:'photo', role:'group', text:'今日のメンバーを、席のまま一枚。',      hint:'立たなくていい。振り向かなくていい。'},
  {id:'B10', scene:'bar',  media:'photo', role:'other', text:'一番静かにしている人を、一枚。',        hint:'盛り上げ役以外にも、その夜はある。'},

  /* ── ホテル（hotel）23-28 ─────────────────── */
  {id:'H01', scene:'hotel',media:'photo', role:'place', text:'このホテルで一番好きな場所を、一枚。',  hint:'部屋の中でも、廊下でも、ロビーでもいい。'},
  {id:'H02', scene:'hotel',media:'photo', role:'other', text:'今日の夕日を、大切な人と。',            hint:'夕日だけの写真にしない。'},
  {id:'H03', scene:'hotel',media:'photo', role:'group', text:'部屋でくだらない話をしている時間を。',  hint:'この時間が、いちばん忘れる。'},
  {id:'H04', scene:'hotel',media:'photo', role:'place', text:'朝、窓を開けた最初の景色を。',          hint:'まだ誰も起きていないうちに。'},
  {id:'H05', scene:'hotel',media:'video', role:'group', text:'チェックアウト前の部屋を、10秒歩きながら。', hint:'荷物が散らかったままでいい。'},
  {id:'H06', scene:'hotel',media:'photo', role:'other', text:'このホテルで一番笑った瞬間を。',        hint:'廊下でも、朝食でも、風呂上がりでも。'},

  /* ── 食（food）29-32 ──────────────────────── */
  {id:'F01', scene:'food', media:'photo', role:'other', text:'料理と、今日いちばんいい顔を。',        hint:'料理だけの写真は、あとで見返さない。'},
  {id:'F02', scene:'food', media:'photo', role:'other', text:'最初の一口の顔を、一枚。',              hint:'口に入れた直後がピーク。'},
  {id:'F03', scene:'food', media:'photo', role:'group', text:'テーブル全体を、真上から。',            hint:'手が写り込むと、その日の人数がわかる。'},
  {id:'F04', scene:'food', media:'audio', role:'group', text:'「いただきます」を録ろう。',            hint:'5秒でいい。'},

  /* ── 学校（school）33-38 ──────────────────── */
  {id:'S01', scene:'school',media:'photo',role:'other', text:'教室の、いつもの席を一枚。',            hint:'座っている人ごと撮っていい。'},
  {id:'S02', scene:'school',media:'photo',role:'other', text:'先生が笑っている瞬間を。',              hint:'怒っている顔なら、それはそれで残す。'},
  {id:'S03', scene:'school',media:'photo',role:'group', text:'休み時間の、何もしていない時間を。',    hint:'イベントより日常が消えていく。'},
  {id:'S04', scene:'school',media:'video',role:'group', text:'教室のざわざわを、10秒。',              hint:'この音は卒業したら二度と録れない。'},
  {id:'S05', scene:'school',media:'photo',role:'other', text:'いつも隣の席の人を、一枚。',            hint:'来年は隣じゃない。'},
  {id:'S06', scene:'school',media:'photo',role:'place', text:'帰り道を、一枚。',                      hint:'毎日通った道こそ撮っていない。'},

  /* ── 部活（club）39-42 ────────────────────── */
  {id:'C01', scene:'club', media:'photo', role:'place', text:'部室を、そのまま一枚。',                hint:'片付けないで撮るのが正解。'},
  {id:'C02', scene:'club', media:'photo', role:'other', text:'練習後の、疲れた顔を。',                hint:'試合よりこの顔をあとで見たくなる。'},
  {id:'C03', scene:'club', media:'video', role:'group', text:'移動のバスの中を、10秒。',              hint:'寝ていてもいい。'},
  {id:'C04', scene:'club', media:'photo', role:'other', text:'一番声を出している人を、一枚。',        hint:'その声は写真には写らないけど、顔に出る。'},

  /* ── 家族（family）43-46 ──────────────────── */
  {id:'M01', scene:'family',media:'photo',role:'other', text:'今日は子どもじゃなく、お母さんを撮ろう。', hint:'撮る人ほど、写真が残っていない。'},
  {id:'M02', scene:'family',media:'audio',role:'other', text:'今日は写真じゃなく、お母さんの声を残そう。', hint:'内容は何でもいい。20秒でいい。'},
  {id:'M03', scene:'family',media:'photo',role:'group', text:'いつもの食卓を、一枚。',                hint:'特別な日じゃない日に。'},
  {id:'M04', scene:'family',media:'photo',role:'other', text:'寝ている子どもと、抱えている人を。',    hint:'顔が見えなくてもいい。'},

  /* ── カップル（couple）47-48 ──────────────── */
  {id:'K01', scene:'couple',media:'photo',role:'other', text:'今日、好きだと思った瞬間を一枚。',      hint:'理由は言わなくていい。'},
  {id:'K02', scene:'couple',media:'photo',role:'other', text:'隣を歩いているときの手元を。',          hint:'顔が入らない写真も、思い出になる。'},

  /* ── 会社・イベント（company）49-50 ────────── */
  {id:'W01', scene:'company',media:'photo',role:'other',text:'普段いちばん話さない人を、一枚。',      hint:'一言かけてからでいい。'},
  {id:'W02', scene:'company',media:'photo',role:'group',text:'準備しているところを、一枚。',          hint:'本番より、準備が残らない。'}
];

window.ML_SCENE_LABEL = {
  trip:'旅', bar:'BAR・夜', hotel:'ホテル', food:'食', school:'学校',
  club:'部活', family:'家族', couple:'カップル', company:'会社・イベント', anytime:'日常'
};
window.ML_MEDIA_LABEL = { photo:'写真', video:'動画', audio:'音声' };
