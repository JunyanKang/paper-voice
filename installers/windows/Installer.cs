using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Threading.Tasks;
using System.Windows.Forms;

class Installer : Form {
    static readonly string Root = AppDomain.CurrentDomain.BaseDirectory;
    Label status;
    Button action;
    ProgressBar progress;
    bool working, complete;
    static Tuple<int,string> Install() {
        string resources = Path.Combine(Root,"Resources");
        string python = Path.Combine(resources,"engine","python","python.exe");
        if (!File.Exists(python) || !File.Exists(Path.Combine(resources,"install_engine.py")))
            return Tuple.Create(1,"安装文件不完整。请先完整解压 ZIP，并保留 Resources 文件夹。");
        try {
            var info = new ProcessStartInfo(python,"-E -s -B -X utf8 \""+Path.Combine(resources,"install_engine.py")+"\"");
            info.UseShellExecute=false; info.CreateNoWindow=true; info.RedirectStandardOutput=true; info.RedirectStandardError=true;
            info.StandardOutputEncoding=System.Text.Encoding.UTF8; info.StandardErrorEncoding=System.Text.Encoding.UTF8;
            using (var process=Process.Start(info)) {
                var stdout=process.StandardOutput.ReadToEndAsync(); var stderr=process.StandardError.ReadToEndAsync();
                process.WaitForExit(); Task.WaitAll(stdout,stderr);
                return Tuple.Create(process.ExitCode,stdout.Result+stderr.Result);
            }
        } catch(Exception e) {return Tuple.Create(1,e.Message);}
    }
    Label TextAt(string value,float size,FontStyle style,int x,int y,int width,int height,Color color) {
        var label=new Label{Text=value,Font=new Font("Microsoft YaHei UI",size,style),Location=new Point(x,y),Size=new Size(width,height),ForeColor=color};
        Controls.Add(label);return label;
    }
    Installer() {
        Text="Paper Voice 安装助手";ClientSize=new Size(600,440);FormBorderStyle=FormBorderStyle.FixedDialog;MaximizeBox=false;
        StartPosition=FormStartPosition.CenterScreen;BackColor=Color.FromArgb(249,247,242);AutoScaleMode=AutoScaleMode.Dpi;
        var teal=Color.FromArgb(18,64,71);
        using(var s=typeof(Installer).Assembly.GetManifestResourceStream("mascot.png")) {
            var picture=new PictureBox{Image=new Bitmap(s),SizeMode=PictureBoxSizeMode.Zoom,Location=new Point(425,42),Size=new Size(140,165)};Controls.Add(picture);
        }
        Icon=Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        TextAt("PAPER VOICE  /  FOR ZOTERO",9,FontStyle.Bold,40,38,380,24,teal);
        TextAt("让论文，读给你听。",23,FontStyle.Bold,36,92,395,50,teal);
        TextAt("自然声音，本地运行。\n为你的 Zotero 准备好六种英文声音。",11,FontStyle.Regular,40,158,370,58,Color.DimGray);
        TextAt("01  安装离线声音",12,FontStyle.Bold,40,240,520,28,teal);
        TextAt("02  在 Zotero 中添加下载包里的 .xpi 插件",10,FontStyle.Regular,40,275,520,25,Color.DimGray);
        status=TextAt("无需账户，无需联网下载，不需要管理员密码。",9,FontStyle.Regular,40,316,520,48,Color.DimGray);
        progress=new ProgressBar{Location=new Point(40,367),Size=new Size(520,4),Style=ProgressBarStyle.Marquee,Visible=false};Controls.Add(progress);
        action=new Button{Text="安装声音",Location=new Point(410,385),Size=new Size(150,36),FlatStyle=FlatStyle.Flat,BackColor=teal,ForeColor=Color.White};
        action.FlatAppearance.BorderSize=0;action.Click+=Start;Controls.Add(action);AcceptButton=action;
        var help=new LinkLabel{Text="安装帮助",Location=new Point(40,396),AutoSize=true,LinkColor=teal};help.LinkClicked+=(s,e)=>Process.Start("https://github.com/JunyanKang/paper-voice/blob/main/docs/INSTALL.md");Controls.Add(help);
        FormClosing+=(s,e)=>{if(working)e.Cancel=true;};
    }
    async void Start(object sender,EventArgs e) {
        if(complete){Close();return;}
        working=true;action.Enabled=false;action.Text="正在安装…";progress.Visible=true;status.Text="正在配置本地声音，请稍候。你的文献和批注不会改变。";
        var result=await Task.Run(()=>Install());
        working=false;action.Enabled=true;progress.Visible=false;
        if(result.Item1==0){complete=true;action.Text="完成";status.Text="声音已就绪。打开 Zotero → 工具 → 插件 → 齿轮 → 从文件安装，选择下载包里的 .xpi 文件。";}
        else {action.Text="重试安装";status.Text="安装未完成，原有声音保持不变。";MessageBox.Show(this,result.Item2,"暂时无法完成安装",MessageBoxButtons.OK,MessageBoxIcon.Warning);}
    }
    [STAThread] static int Main(string[] args) {
        if(Array.IndexOf(args,"/quiet")>=0) {
            var result=Install();
            if(args.Length>1)File.WriteAllText(args[1],result.Item2);
            return result.Item1;
        }
        Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);Application.Run(new Installer());return 0;
    }
}
