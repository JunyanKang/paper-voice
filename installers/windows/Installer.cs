using System;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Threading.Tasks;
using System.Windows.Forms;

class Installer : Form {
    static readonly string Root = AppDomain.CurrentDomain.BaseDirectory;
    Label status;
    Button action;
    ProgressBar progress;
    bool working, complete;
    bool english = !CultureInfo.CurrentUICulture.Name.StartsWith("zh");
    Label heading, description, stepOne, stepTwo, readyLabel;
    LinkLabel help;
    ComboBox language;
    string Tr(string zh, string en) {return english ? en : zh;}
    void RefreshLanguage() {
        Text=Tr("Paper Voice 安装助手","Paper Voice Installer");
        heading.Text=Tr("让论文，读给你听。","Listen. Understand. Explore.");
        heading.Font=new Font("Microsoft YaHei UI",english?18:23,FontStyle.Bold);
        description.Text=Tr("自然声音，本地运行。\n英语、中文、日语、法语，随时听读。","Natural voices. Right on your computer.\nEnglish, Chinese, Japanese and French.");
        stepOne.Text=Tr("01  安装离线声音","01  Set up offline voices");
        stepTwo.Text=Tr("02  在 Zotero 中添加下载包里的 .xpi 插件","02  Add the included .xpi plugin to Zotero");
        readyLabel.Text=Tr("✓ 声音已就绪","✓ Voices ready");readyLabel.Visible=complete;
        stepTwo.ForeColor=complete?Color.FromArgb(18,64,71):Color.DimGray;
        stepTwo.Font=new Font("Microsoft YaHei UI",10,complete?FontStyle.Bold:FontStyle.Regular);
        help.Text=Tr("安装帮助","Help");
        action.Text=complete?Tr("完成","Done"):Tr("安装声音","Install voices");
        status.Text=complete?Tr("下一步：打开 Zotero → 工具 → 插件 → 齿轮 → 从文件安装，选择下载包里的 .xpi 文件。","Next: In Zotero: Tools → Plugins → gear → Install Plugin From File. Choose the included .xpi."):Tr("无需账户，无需联网下载，不需要管理员密码。","No account, extra downloads or administrator password needed.");
    }
    static Tuple<int,string> Install(bool english) {
        string resources = Path.Combine(Root,"Resources");
        string python = Path.Combine(resources,"engine","python","python.exe");
        if (!File.Exists(python) || !File.Exists(Path.Combine(resources,"install_engine.py")))
            return Tuple.Create(1,english?"Installation files are missing. Extract the complete ZIP and keep the Resources folder beside this installer.":"安装文件不完整。请先完整解压 ZIP，并保留 Resources 文件夹。");
        try {
            var info = new ProcessStartInfo(python,"-E -s -B -X utf8 \""+Path.Combine(resources,"install_engine.py")+"\" --lang "+(english?"en":"zh"));
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
        Icon=System.Drawing.Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        TextAt("PAPER VOICE  /  FOR ZOTERO",9,FontStyle.Bold,40,38,380,24,teal);
        heading=TextAt("让论文，读给你听。",23,FontStyle.Bold,36,92,395,50,teal);
        description=TextAt("自然声音，本地运行。\n英语、中文、日语、法语，随时听读。",11,FontStyle.Regular,40,158,370,58,Color.DimGray);
        stepOne=TextAt("01  安装离线声音",12,FontStyle.Bold,40,240,255,28,teal);
        readyLabel=TextAt("",9,FontStyle.Regular,300,244,260,24,Color.FromArgb(46,110,82));readyLabel.Visible=false;
        stepTwo=TextAt("02  在 Zotero 中添加下载包里的 .xpi 插件",10,FontStyle.Regular,40,275,520,25,Color.DimGray);
        status=TextAt("无需账户，无需联网下载，不需要管理员密码。",9,FontStyle.Regular,40,316,520,48,Color.DimGray);
        progress=new ProgressBar{Location=new Point(40,367),Size=new Size(520,4),Style=ProgressBarStyle.Marquee,Visible=false};Controls.Add(progress);
        action=new Button{Text="安装声音",Location=new Point(410,385),Size=new Size(150,36),FlatStyle=FlatStyle.Flat,BackColor=teal,ForeColor=Color.White};
        action.FlatAppearance.BorderSize=0;action.Click+=Start;Controls.Add(action);AcceptButton=action;
        help=new LinkLabel{Text="安装帮助",Location=new Point(40,396),AutoSize=true,LinkColor=teal};help.LinkClicked+=(s,e)=>Process.Start("https://github.com/JunyanKang/paper-voice/blob/main/docs/"+(english?"INSTALL.en.md":"INSTALL.md"));Controls.Add(help);
        language=new ComboBox{Location=new Point(140,390),Size=new Size(120,28),DropDownStyle=ComboBoxStyle.DropDownList,AccessibleName="Language / 语言"};
        language.Items.AddRange(new object[]{"简体中文","English"});language.SelectedIndex=english?1:0;
        language.SelectedIndexChanged+=(s,e)=>{english=language.SelectedIndex==1;RefreshLanguage();};Controls.Add(language);RefreshLanguage();
        FormClosing+=(s,e)=>{if(working)e.Cancel=true;};
    }
    async void Start(object sender,EventArgs e) {
        if(complete){Close();return;}
        working=true;action.Enabled=false;language.Enabled=false;action.Text=Tr("正在安装…","Installing…");progress.Visible=true;status.Text=Tr("正在配置本地声音，请稍候。你的文献和批注不会改变。","Setting up voices. Your papers and annotations stay unchanged.");
        var result=await Task.Run(()=>Install(english));
        working=false;action.Enabled=true;language.Enabled=true;progress.Visible=false;
        if(result.Item1==0){complete=true;RefreshLanguage();}
        else {action.Text=Tr("重试安装","Try again");status.Text=Tr("安装未完成，原有声音保持不变。","Installation did not finish. Your existing voices are unchanged.");MessageBox.Show(this,result.Item2,Tr("暂时无法完成安装","Unable to complete installation"),MessageBoxButtons.OK,MessageBoxIcon.Warning);}
    }
    [STAThread] static int Main(string[] args) {
        if(Array.IndexOf(args,"/quiet")>=0) {
            var result=Install(Array.IndexOf(args,"/english")>=0);
            if(args.Length>1)File.WriteAllText(args[1],result.Item2);
            return result.Item1;
        }
        Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);Application.Run(new Installer());return 0;
    }
}
