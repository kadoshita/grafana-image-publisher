# grafana-image-publisher

Grafanaのグラフ画像を共有するプログラム

GET /graph/:host/:panel/:ts/:duration

* /:host/:panel/:ts/:durationが存在する→画像データを返す
* 存在しない→画像をGrafanaから取得する
* 画像を取得できた→/:host/:panel/:ts/:durationに画像を保存し、画像データを返す
* 取得失敗→404を返す