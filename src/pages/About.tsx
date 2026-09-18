function Para({
  title,
  icon,
  description,
  children,
}: {
  title: string;
  icon: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="para">
      <div className="para-title">
        <div className="para-title-icon">
          <span className="material-icons" aria-hidden="true">{icon}</span>
        </div>
        <div className="para-title-text">{title}</div>
      </div>
      {description && <p className="para-description">{description}</p>}
      {children && <div className="para-content">{children}</div>}
    </div>
  );
}

export default function About() {
  return (
    <div className="about">
      <div className="about-col">
        <h1 className="about-title">西安交通大学软件镜像站</h1>

        <Para
          title="运维团队"
          icon="group"
          description=""
        >
          <p>
            本站由
            <a href="https://nic.xjtu.edu.cn/" target="_blank" rel="noopener">
              西安交通大学网络信息中心
            </a>
            提供设备与资源支持，由
            <a href="https://xjtuana.com/" target="_blank" rel="noopener">
              西安交通大学学生网络管理协会
            </a>
            运行维护。
          </p>
          <p>
            原运维团队为
            <a href="https://www.tiaozhan.com/" target="_blank" rel="noopener">
              西安交通大学团委挑战网
            </a>
            ，于 2018 年将运维工作移交至西交网管会。感谢挑战网对镜像站的付出与大力支持！
          </p>
        </Para>

        <Para
          title="联系我们"
          icon="mail"
          description=""
        >
          <ul className="about-guide">
            <li className="about-guide-item">
              <h3>GitHub 工单</h3>
              <p>
                在我们的{' '}
                <a href="https://github.com/openana/mirrors.xjtu.edu.cn/issues/new" target="_blank" rel="noopener">
                  GitHub 公开仓库
                </a>{' '}
                中提交工单。为了使您的提问能够给后来者提供参考，我们推荐您使用此方式。
              </p>
            </li>
            <li className="about-guide-item">
              <h3>电子邮件</h3>
              <p>
                向{' '}
                <a href="mailto:mirrors@xjtu.edu.cn">mirrors@xjtu.edu.cn</a>{' '}
                发送电子邮件。
              </p>
            </li>
          </ul>
        </Para>

        <Para
          title="域名选择"
          icon="language"
          description=""
        >
          <ul className="about-guide">
            <li className="about-guide-item">
              <h3>自动选择</h3>
              <p>
                <a href="https://mirrors.xjtu.edu.cn" target="_blank" rel="noopener">
                  mirrors.xjtu.edu.cn
                </a>
              </p>
            </li>
            <li className="about-guide-item">
              <h3>只解析 IPv6</h3>
              <p>
                <a href="https://mirrors6.xjtu.edu.cn" target="_blank" rel="noopener">
                  mirrors6.xjtu.edu.cn
                </a>
              </p>
            </li>
            <li className="about-guide-item">
              <h3>只解析 IPv4</h3>
              <p>
                <a href="https://mirrors4.xjtu.edu.cn" target="_blank" rel="noopener">
                  mirrors4.xjtu.edu.cn
                </a>
              </p>
            </li>
          </ul>
        </Para>

        <Para
          title="许可协议"
          icon="gavel"
          description=""
        >
          <p>
            除特殊注明外，
            <a href="https://github.com/openana/app-mirrors" target="_blank" rel="noopener">
              本站源码
            </a>
            在{' '}
            <a href="https://github.com/openana/app-mirrors/blob/main/LICENSE" target="_blank" rel="noopener">
              Apache License 2.0
            </a>{' '}
            许可下发布。
          </p>
          <p>
            根据相关法律法规，本站不对欧盟用户提供服务。
          </p>
          <p>
            本站帮助文档来源于{' '}
            <a href="https://github.com/mirrorz-org/mirrorz-docs" target="_blank" rel="noopener">
              mirrorz-docs
            </a>{' '}
            ，在{' '}
            <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode" target="_blank" rel="noopener">
              CC BY-NC-SA 4.0
            </a>{' '}
            许可下发布。
          </p>
        </Para>

        <Para
          title="相关链接"
          icon="link"
          description=""
        >
          <ul className="about-url-list">
            <li>
              <a href="https://www.xjtu.edu.cn/" target="_blank" rel="noopener">
                西安交通大学
              </a>
            </li>
            <li>
              <a href="https://nic.xjtu.edu.cn/" target="_blank" rel="noopener">
                西安交通大学网络信息中心
              </a>
            </li>
            <li>
              <a href="https://xjtuana.com/" target="_blank" rel="noopener">
                西安交通大学学生网络管理协会
              </a>
            </li>
            <li>
              <a href="https://www.tiaozhan.com/" target="_blank" rel="noopener">
                西安交通大学团委挑战网
              </a>
            </li>
            <li>
              <a href="https://mirrors.cernet.edu.cn/" target="_blank" rel="noopener">
                教育网联合镜像站
              </a>
            </li>
          </ul>
        </Para>
      </div>
    </div>
  );
}