import com.sun.net.httpserver.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;

public class MockServer {
    public static void main(String[] args) throws Exception {
        int httpPort = 80;
        HttpServer server = HttpServer.create(new InetSocketAddress(httpPort), 0);

        server.createContext("/", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) throws IOException {
                URI uri = exchange.getRequestURI();
                String path = uri.getPath();
                String query = uri.getQuery() != null ? uri.getQuery() : "";
                String userAgent = exchange.getRequestHeaders().getFirst("User-Agent");
                if (userAgent == null) userAgent = "";
                String method = exchange.getRequestMethod();

                byte[] reqBodyBytes = exchange.getRequestBody().readAllBytes();
                String reqBody = new String(reqBodyBytes, StandardCharsets.UTF_8);

                System.out.println("----------------------------------------");
                System.out.println("收到 HTTP 请求: " + method + " " + uri.toString());
                if (reqBody.length() > 0) {
                    if (reqBody.length() > 200) {
                        String snippet = reqBody.substring(Math.max(0, reqBody.length() - 120));
                        System.out.println("POST Body (tail): " + snippet);
                    } else {
                        System.out.println("POST Body: " + reqBody);
                    }
                }

                byte[] response;
                String contentType = "application/json; charset=utf-8";

                // 0. code=11 拦截：客户端选服完成的重定向目标，直接返回空内容触发客户端原生进入游戏
                if (query.contains("code=11")) {
                    contentType = "text/html; charset=utf-8";
                    response = "".getBytes(StandardCharsets.UTF_8);
                    System.out.println(">>> 收到 code=11 回调，响应空内容完成原生接管");
                }
                // 1. CDN 地址分发
                else if (reqBody.contains("action=get_cdn") || query.contains("action=get_cdn")) {
                    contentType = "text/plain; charset=utf-8";
                    response = "http://192.168.10.50/\n".getBytes(StandardCharsets.UTF_8);
                    System.out.println(">>> 下发 CDN: http://192.168.10.50/");
                }
                // 2. 游戏登录鉴权 game_login_info.php
                else if (path.contains("game_login_info.php")) {
                    String json = "{\n" +
                            "  \"code\": 1,\n" +
                            "  \"result\": 1,\n" +
                            "  \"userid\": \"10001\",\n" +
                            "  \"serverid\": 1,\n" +
                            "  \"ServerID\": 1,\n" +
                            "  \"ip\": \"192.168.10.50\",\n" +
                            "  \"port\": 8008,\n" +
                            "  \"pwd\": \"offline_token_888\",\n" +
                            "  \"domain\": \"192.168.10.50\",\n" +
                            "  \"client_id\": \"3FC90F21BC31DD7C\",\n" +
                            "  \"access_token\": \"offline_token_888\",\n" +
                            "  \"UserToken\": \"offline_token_888\",\n" +
                            "  \"IsUserToken\": 1,\n" +
                            "  \"LoginServerUrl\": \"http://192.168.10.50/index.php\",\n" +
                            "  \"ChooseServerUrl\": \"http://192.168.10.50/game_list.php\",\n" +
                            "  \"LoginUrl\": \"http://192.168.10.50/game_login_info.php\",\n" +
                            "  \"data\": {\n" +
                            "    \"userid\": \"10001\",\n" +
                            "    \"username\": \"大明豪杰\",\n" +
                            "    \"serverid\": 1,\n" +
                            "    \"ServerID\": 1,\n" +
                            "    \"ip\": \"192.168.10.50\",\n" +
                            "    \"port\": 8008,\n" +
                            "    \"pwd\": \"offline_token_888\",\n" +
                            "    \"token\": \"offline_token_888\"\n" +
                            "  }\n" +
                            "}";
                    response = json.getBytes(StandardCharsets.UTF_8);
                    System.out.println(">>> 响应 game_login_info.php 鉴权");
                }
                // 4. XML 配置文件
                else if (path.endsWith(".xml")) {
                    contentType = "text/xml; charset=utf-8";
                    response = "<config></config>".getBytes(StandardCharsets.UTF_8);
                    System.out.println(">>> 下发 XML 配置: " + path);
                }
                // 5. C++ 引擎 index.php 业务协议核心
                else if (path.contains("index.php") && "POST".equalsIgnoreCase(method)) {
                    // 5.1 首次登录/版本验证：包含 action=login 或 action=get_version 时下发完整登录与大地图初始化流
                    if (reqBody.contains("action=login") || reqBody.contains("action=get_version")) {
                        String json = "[\n" +
                                "  {\n" +
                                "    \"event\": \"LOGIN_RECIEVE_EVENT\",\n" +
                                "    \"result\": 1,\n" +
                                "    \"code\": 1,\n" +
                                "    \"role_state\": 1,\n" +
                                "    \"version\": \"1012\",\n" +
                                "    \"flash\": \"\",\n" +
                                "    \"announcement\": \"大明浮生记离线单机运行中\",\n" +
                                "    \"PHPSESSID\": \"offline_session_888\",\n" +
                                "    \"id\": 10001,\n" +
                                "    \"playerName\": \"大明天子\",\n" +
                                "    \"sex\": 1,\n" +
                                "    \"tpl_id\": 1,\n" +
                                "    \"cityId\": 1,\n" +
                                "    \"banghui_id\": 0,\n" +
                                "    \"domain_id\": 1,\n" +
                                "    \"isFirstLogin\": 0,\n" +
                                "    \"help_step\": 99,\n" +
                                "    \"platform_id\": 100,\n" +
                                "    \"status\": 1,\n" +
                                "    \"gold\": 999999,\n" +
                                "    \"silver\": 999999\n" +
                                "  },\n" +
                                "  {\n" +
                                "    \"event\": \"SHOW_BIG_MAP\",\n" +
                                "    \"result\": 1,\n" +
                                "    \"status\": 1,\n" +
                                "    \"data_already\": {\"1\": 1},\n" +
                                "    \"data_pass\": {\"1\": 1, \"2\": 1, \"3\": 1, \"4\": 1, \"5\": 1, \"6\": 1, \"7\": 1, \"8\": 1, \"9\": 1, \"10\": 1, \"11\": 1, \"12\": 1, \"13\": 1, \"14\": 1, \"15\": 1},\n" +
                                "    \"data_can\": {\"1\": 1, \"2\": 1, \"3\": 1, \"4\": 1, \"5\": 1, \"6\": 1, \"7\": 1, \"8\": 1, \"9\": 1, \"10\": 1, \"11\": 1, \"12\": 1, \"13\": 1, \"14\": 1, \"15\": 1},\n" +
                                "    \"flagInfo\": {}\n" +
                                "  },\n" +
                                "  {\n" +
                                "    \"event\": \"MOVE_CITY\",\n" +
                                "    \"result\": 1,\n" +
                                "    \"status\": 1,\n" +
                                "    \"city_id\": \"1\"\n" +
                                "  },\n" +
                                "  {\n" +
                                "    \"event\": \"BEGIN_INIT\",\n" +
                                "    \"result\": 1,\n" +
                                "    \"role_state\": 1,\n" +
                                "    \"status\": 1\n" +
                                "  },\n" +
                                "  {\n" +
                                "    \"event\": \"REFRESH_PLAYER_STATUES\",\n" +
                                "    \"id\": 10001,\n" +
                                "    \"status\": 1,\n" +
                                "    \"role_state\": 1\n" +
                                "  },\n" +
                                "  {\n" +
                                "    \"event\": \"UPDATE_COOL_DOWN_TIMER\",\n" +
                                "    \"status\": 1\n" +
                                "  }\n" +
                                "]";
                        response = json.getBytes(StandardCharsets.UTF_8);
                        System.out.println(">>> 首次登录: 下发完整初始事件流");
                    }
                    // 5.2 大地图请求
                    else if (reqBody.contains("action=map") || reqBody.contains("show_big_map")) {
                        String json = "[\n" +
                                "  {\n" +
                                "    \"event\": \"SHOW_BIG_MAP\",\n" +
                                "    \"result\": 1,\n" +
                                "    \"status\": 1,\n" +
                                "    \"data_already\": {\"1\": 1},\n" +
                                "    \"data_pass\": {\"1\": 1, \"2\": 1, \"3\": 1, \"4\": 1, \"5\": 1, \"6\": 1, \"7\": 1, \"8\": 1, \"9\": 1, \"10\": 1, \"11\": 1, \"12\": 1, \"13\": 1, \"14\": 1, \"15\": 1},\n" +
                                "    \"data_can\": {\"1\": 1, \"2\": 1, \"3\": 1, \"4\": 1, \"5\": 1, \"6\": 1, \"7\": 1, \"8\": 1, \"9\": 1, \"10\": 1, \"11\": 1, \"12\": 1, \"13\": 1, \"14\": 1, \"15\": 1},\n" +
                                "    \"flagInfo\": {}\n" +
                                "  },\n" +
                                "  {\n" +
                                "    \"event\": \"UPDATE_COOL_DOWN_TIMER\",\n" +
                                "    \"status\": 1\n" +
                                "  }\n" +
                                "]";
                        response = json.getBytes(StandardCharsets.UTF_8);
                        System.out.println(">>> 响应大地图数据 SHOW_BIG_MAP");
                    }
                    // 5.3 城市跳转请求
                    else if (reqBody.contains("action=move") || (reqBody.contains("module=city") && reqBody.contains("city_id="))) {
                        String targetCity = "1";
                        int idx = reqBody.indexOf("city_id=");
                        if (idx != -1) {
                            int end = reqBody.indexOf('&', idx);
                            if (end == -1) end = reqBody.length();
                            targetCity = reqBody.substring(idx + 8, end);
                        }
                        String json = "[\n" +
                                "  {\n" +
                                "    \"event\": \"MOVE_CITY\",\n" +
                                "    \"result\": 1,\n" +
                                "    \"status\": 1,\n" +
                                "    \"city_id\": \"" + targetCity + "\"\n" +
                                "  },\n" +
                                "  {\n" +
                                "    \"event\": \"UPDATE_COOL_DOWN_TIMER\",\n" +
                                "    \"status\": 1\n" +
                                "  }\n" +
                                "]";
                        response = json.getBytes(StandardCharsets.UTF_8);
                        System.out.println(">>> 响应城市跳转: MOVE_CITY to " + targetCity);
                    }
                    // 5.4 角色状态查询
                    else if (reqBody.contains("action=role_state")) {
                        String json = "[{\"event\":\"REFRESH_PLAYER_STATUES\",\"id\":10001,\"status\":1,\"role_state\":1}]";
                        response = json.getBytes(StandardCharsets.UTF_8);
                        System.out.println(">>> 响应角色状态查询");
                    }
                    // 5.5 心跳/防沉迷/常规轮询 (严禁再下发 LOGIN_RECIEVE_EVENT)
                    else {
                        String json = "[{\"event\":\"UPDATE_COOL_DOWN_TIMER\",\"status\":1}]";
                        response = json.getBytes(StandardCharsets.UTF_8);
                        System.out.println(">>> 响应常规心跳: UPDATE_COOL_DOWN_TIMER (稳定维持 Stage 5)");
                    }
                }
                // 6. Java 原生 (Dalvik / HttpClient) API 返回 JSON 选服列表
                else if (userAgent.contains("Dalvik") || userAgent.contains("Apache-HttpClient")) {
                    String json = "{\"code\":1,\"result\":1,\"server_list\":[{\"server_id\":1,\"server_name\":\"大明一统天下\",\"ip\":\"192.168.10.50\",\"port\":8008,\"status\":1}],\"data\":{\"userid\":\"10001\",\"username\":\"大明天子\",\"token\":\"offline_token_888\"}}";
                    response = json.getBytes(StandardCharsets.UTF_8);
                    System.out.println(">>> 响应后台 Dalvik API: 返回 JSON 选服列表");
                }
                // 7. WebView 访问 (根目录、game_list.php 等)：自动秒级跳转选服进入游戏
                else {
                    contentType = "text/html; charset=utf-8";
                    String targetUrl = "http://p.51wan.com/index.php?client_id=3FC90F21BC31DD7C&access_token=offline_token_888&game=dmfs&server=1&code=11";
                    String html = "<!DOCTYPE html>\n" +
                            "<html>\n" +
                            "<head>\n" +
                            "  <meta charset=\"utf-8\">\n" +
                            "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, user-scalable=no\">\n" +
                            "  <title>大明浮生记 选服</title>\n" +
                            "  <style>\n" +
                            "    body { background: #121218; color: #ffffff; font-family: -apple-system, sans-serif; text-align: center; margin: 0; padding: 40px 15px; }\n" +
                            "    .card { max-width: 340px; margin: 0 auto; background: #1e1e28; border-radius: 12px; padding: 25px 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.6); border: 1px solid #333348; }\n" +
                            "    h1 { color: #f1c40f; font-size: 24px; margin: 0 0 8px; }\n" +
                            "    .sub { color: #95a5a6; font-size: 13px; margin-bottom: 25px; }\n" +
                            "    .btn { display: block; width: 100%; box-sizing: border-box; background: linear-gradient(135deg, #e67e22, #d35400); color: #fff; font-size: 18px; font-weight: bold; padding: 14px 0; border: none; border-radius: 8px; text-decoration: none; margin-top: 15px; cursor: pointer; box-shadow: 0 4px 15px rgba(230,126,34,0.4); }\n" +
                            "  </style>\n" +
                            "</head>\n" +
                            "<body>\n" +
                            "  <div class=\"card\">\n" +
                            "    <h1>大明浮生记</h1>\n" +
                            "    <div class=\"sub\">离线服务正在自动进入游戏...</div>\n" +
                            "    <a class=\"btn\" href=\"" + targetUrl + "\">进入游戏 [大明一统天下]</a>\n" +
                            "  </div>\n" +
                            "  <script>\n" +
                            "    setTimeout(function() {\n" +
                            "      window.location.href = '" + targetUrl + "';\n" +
                            "    }, 300);\n" +
                            "  </script>\n" +
                            "</body>\n" +
                            "</html>";
                    response = html.getBytes(StandardCharsets.UTF_8);
                    System.out.println(">>> 响应 WebView 选服页面，携带自动跳转 code=11");
                }

                exchange.getResponseHeaders().set("Content-Type", contentType);
                exchange.getResponseHeaders().set("Connection", "keep-alive");
                exchange.sendResponseHeaders(200, response.length);
                OutputStream os = exchange.getResponseBody();
                os.write(response);
                os.close();
            }
        });

        server.setExecutor(java.util.concurrent.Executors.newCachedThreadPool());
        server.start();
        System.out.println(">>> 智能全功能离线服务 (HTTP 80) 已启动！");

        // 启动 8008 TCP 空响应服务
        new Thread(() -> {
            try {
                ServerSocket ss = new ServerSocket(8008);
                System.out.println(">>> 8008 TCP 端口监听已就绪！");
                while (true) {
                    Socket s = ss.accept();
                    new Thread(() -> {
                        try {
                            InputStream in = s.getInputStream();
                            OutputStream out = s.getOutputStream();
                            byte[] b = new byte[1024];
                            int len;
                            while ((len = in.read(b)) != -1) {
                                System.out.println(">>> [8008] 收到 (" + len + " 字节)");
                            }
                        } catch (Exception e) {}
                    }).start();
                }
            } catch (Exception e) {
                System.err.println("8008 监听错误: " + e.getMessage());
            }
        }).start();

        Thread.currentThread().join();
    }
}
